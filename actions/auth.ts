"use server";

export async function login(formData: FormData) {
  const username = formData.get("username");
  const password = formData.get("password");

  // TODO: check the username and password, then start a session.
  void username;
  void password;
}
