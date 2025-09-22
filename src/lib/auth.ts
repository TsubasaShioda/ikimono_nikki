import { jwtVerify, JWTPayload } from 'jose';

interface UserPayload extends JWTPayload {
  id: string;
  // 他にJWTに含めているユーザー情報があればここに追加
}

export async function verifyToken(token: string | undefined): Promise<UserPayload | null> {
  if (!token) {
    return null;
  }
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify<UserPayload>(token, secret);
    return payload;
  } catch (error) {
    console.error("Invalid token:", error);
    return null;
  }
}
