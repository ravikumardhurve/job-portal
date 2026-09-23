import { getCandidateSessionName } from "@/lib/candidate-auth";

export async function POST() {
  const response = Response.json({ data: { success: true } });
  response.headers.append("Set-Cookie", `${getCandidateSessionName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
  return response;
}
