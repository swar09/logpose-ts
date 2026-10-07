import { UserRole } from "./users";

export type LoginData = {
    user: UserRole,
    token: string,
    tokenType: string,
    expiresIn: number, // secs  
}

export type LoginRequest = {
    loginId: string,  // username or email 
    password: string, // password unhashed
}

export type LoginResponse = {
    data?: LoginData,
    sucess: boolean,
}

// TODO : add models for o-auth with google 
