import { Url } from "./urls";

export enum UserRole {
    ADMIN,
    USER,
}
export type User = {
    user_id: string,
    first_name: string,
    last_name: string,
    username: string,
    email: string,
    role: UserRole,
    hashed_password: string
    createdAt: Date,
    updatedAt: Date,
    urls: Url[],
}

export type NewUserRequest = {
    email: string,
    username: string,
    password: string,
    last_name: string,
    first_name: string,
}
export type UserResponse = {
    id: string,
    email: string,
    username: string,
    last_name: string,
    first_name: string,
    createdAt: Date,
    updatedAt: Date,
}

// TODO : add models for o-auth with google 
