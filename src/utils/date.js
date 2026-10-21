import dayjs from "dayjs";

/**
 * Time formatting tool function
 * Return a chainable object with format method for date formatting
 * @param {string | number | Date} value - Original timestamp / date string / Date object
 * @returns {{value: any, format: (template?: string) => string}} Chainable formatter instance
 */
export function formatTime(value) {
    return {
        value,
        /**
         * Format date with specified template
         * @param {string} [template="YYYY-MM-DD HH:mm:ss"] Dayjs format template
         * @returns {string} Formatted date string or "--" for invalid time
         */
        format(template = "YYYY-MM-DD HH:mm:ss") {
            // Return placeholder "--" if timestamp is invalid (less than or equal to 0)
            if (Number(this.value) <= 0) {
                return "--";
            }
            // Format valid date value by dayjs
            return dayjs(this.value).format(template);
        },
    };
}

/**
 * Tool function to accurately calculate age (full years counted on birthday)
 * @param {string} birthDateStr - Date string in YYYY-MM-DD format, length must be 10 characters
 * @returns {string | number} "-" for empty/invalid date; number age for valid birthday
 */
export function calculateAge(birthDateStr) {
    // Handle empty value or invalid date format
    if (!birthDateStr || birthDateStr.length !== 10) {
        return "-"; // Show horizontal line for empty values
    }

    // Parse birth date string to Date object
    const birthDate = new Date(birthDateStr);
    // Verify if the parsed date is valid
    if (isNaN(birthDate.getTime())) {
        return "-";
    }

    // Get current system date
    const today = new Date();
    // Extract year, month, day from dates
    const birthYear = birthDate.getFullYear();
    const birthMonth = birthDate.getMonth(); // Range: 0-11 (0 = January)
    const birthDay = birthDate.getDate();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    // Calculate initial age by year difference
    let age = todayYear - birthYear;

    // Core logic: Check if birthday has occurred this year
    // 1. If current month < birth month → subtract 1 year
    // 2. If month matches but current day < birth day → subtract 1 year
    if (todayMonth < birthMonth || (todayMonth === birthMonth && todayDay < birthDay)) {
        age--;
    }

    // Avoid negative age (when birth date is in the future)
    return age < 0 ? 0 : age;
}

/**
 * Extract birth date string from 18-digit ID card number
 * @param {string} idCard - 18-digit resident identity card number
 * @returns {string} formatted birth date 'YYYY-MM-DD', empty string for invalid input
 */
export function getBirthDateByIdCard(idCard) {
    if (!idCard || idCard.length !== 18) return "";
    const birthCode = idCard.slice(6, 14);
    // Split year/month/day directly by string slice and format
    return `${birthCode.slice(0, 4)}-${birthCode.slice(4, 6)}-${birthCode.slice(6)}`;
}
