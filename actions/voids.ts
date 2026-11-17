"use server";

import { refresh } from "next/cache";
import { getCurrentUser, getDisplayName, getRole } from "@/lib/auth";
import { cafeDayRange, cafeToday } from "@/lib/cafe-time";
import { createClient } from "@/lib/supabase/server";
import { MAX_VOID_REASON_LENGTH } from "@/lib/voids";

/** Voided, or a message to show the admin. */
export type VoidOrderResult = { ok: true } | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The database's code for "a row with this key already exists".
const ALREADY_EXISTS = "23505";

// Voids one of today's orders. Admins only.
//
// The database checks the same rules (supabase/voids.sql), so even a request
// made outside the app can't break them. Checking here first gives the admin
// a clear message instead of a general failure.
export async function voidOrder(orderId: string, reason: string): Promise<VoidOrderResult> {
  // Signed-out callers are sent to the login page.
  const user = await getCurrentUser();

  if ((await getRole(user)) !== "admin") {
    return { ok: false, message: "Only an admin can void orders." };
  }

  if (typeof orderId !== "string" || !UUID.test(orderId)) {
    return { ok: false, message: "Something went wrong with this order. Refresh the page and try again." };
  }

  const cleanReason = typeof reason === "string" ? reason.trim() : "";
  if (!cleanReason || cleanReason.length > MAX_VOID_REASON_LENGTH) {
    return { ok: false, message: "Pick a reason for the void." };
  }

  const supabase = await createClient();

  // Only today's orders can be voided: look for this order among today's.
  const { start, end } = cafeDayRange(cafeToday());
  const { data: order, error: findError } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .gte("created_at", start)
    .lt("created_at", end)
    .maybeSingle();

  if (findError) {
    console.error("Finding the order to void failed:", findError.message);
    return {
      ok: false,
      message: "The order couldn't be voided. Check the internet connection and try again.",
    };
  }
  if (!order) {
    return { ok: false, message: "Only today's orders can be voided." };
  }

  // Who voided it and when are filled in by the database.
  const { error } = await supabase.from("order_voids").insert({
    order_id: orderId,
    reason: cleanReason,
    voided_by_name: getDisplayName(user),
  });

  // "Already exists" means the order is voided already: a double tap, a Try
  // again after an answer got lost, or another admin got there first. Either
  // way the order ends up voided, so that counts as done.
  if (error && error.code !== ALREADY_EXISTS) {
    console.error("Voiding the order failed:", error.message);
    return {
      ok: false,
      message: "The order couldn't be voided. Check the internet connection and try again.",
    };
  }

  // Reload the page's data, so the order now shows as voided.
  refresh();
  return { ok: true };
}
