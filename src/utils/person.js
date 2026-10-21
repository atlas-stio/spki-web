/**
 * Get gender code from 18-digit ID card number
 * @param {string} idCard - 18-digit Chinese resident identity card number
 * @returns {string|undefined} Gender code: "1" for male, "2" for female, undefined for invalid ID
 */
export function getGenderCodeByIdCard(idCard) {
    if (!idCard || typeof idCard !== "string") return undefined;

    const formatIdCard = idCard.trim().toUpperCase();

    const idCardReg = /^[0-9]{17}[0-9X]$/;
    if (!idCardReg.test(formatIdCard)) return undefined;

    const genderDigit = parseInt(formatIdCard.charAt(16), 10);

    return genderDigit % 2 === 1 ? "1" : "2";
}
