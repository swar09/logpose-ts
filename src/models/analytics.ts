export type urlAnalytics = {
    id: string,
    device?: string,
    browser?: string,
    referer?: string,
    short_code?: string,
    clicked_at: Date,
    ip_address: string,
    user_agent?: string,
    country_code?: string,
}
export type newUrlAnalytics = {
    device?: string,
    browser?: string,
    referer?: string,
    short_code?: string,
    clicked_at: Date,
    ip_address: string,
    user_agent?: string,
    country_code?: string,
}