export type DatabaseId = number;

export type Url = {
    database_id: DatabaseId,
    short_code: string,
    long_url: string,
    created_by?: string,
    guest_id?: string,
    expires_at: Date,
    created_at: Date,
    updated_at: Date,
}

export type NewUrl = {
    long_url: string,
    short_code: string,
    created_by: string,
    guest_id: string,
    expires_at: Date,
}

export type NewUrlRequest = {
    long_url: string,
    created_by: string,
    custom_alias: string,
}

export type licNewUrlRequest = {
    long_url: string,
}

export type UpdateUrlRequest = {
    long_url: string,
    short_code: string,
    created_by: string,
    database_id: number,
}