export enum ListingStatus {
    ACTIVE = "active",
    SOLD_OUT = "sold_out",
    AI_PROCESSING = "ai_processing",
    DRAFT = "draft",
}

export const POINTS_TO_DOLLAR_RATIO = {
    100: 1,
    500: 5,
    1000: 10,
};

export const APP_SHORT_NAME = "JMS"; // or whatever your app name is
export const APP_NAME = "JMS"; // or whatever your app name is

export enum UserRole {
    BUYER = "BUYER",
    SELLER = "SELLER",
}
export const POINTS_PER_MEAL_PHOTO = 50;
export const POINTS_PER_ORDER = 100; // or whatever value makes sense
export const AI_POLL_INTERVAL_MS = 100;
export const MAX_AI_LISTINGS = 10;