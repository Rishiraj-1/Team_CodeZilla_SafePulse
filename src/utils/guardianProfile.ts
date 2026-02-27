/**
 * Guardian profile completeness utility.
 * A guardian is "complete" only if they have all three identity fields.
 */
export function isGuardianProfileComplete(user: any): boolean {
    return !!(
        user?.role === 'guardian' &&
        user?.profile_image_url &&
        user?.gender &&
        user?.phone_verified
    );
}

export function guardianMissingFields(user: any): string[] {
    const missing: string[] = [];
    if (!user?.profile_image_url) missing.push('profile photo');
    if (!user?.gender) missing.push('gender');
    if (!user?.phone_verified) missing.push('phone verification');
    return missing;
}
