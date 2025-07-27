/**
 * Token blacklist system for invalidated tokens and permanently banned users
 */

class TokenBlacklist {
  private blacklistedTokens = new Set<string>();
  private bannedUsers = new Set<string>();
  private bannedEmails = new Set<string>();

  addToken(token: string) {
    this.blacklistedTokens.add(token);
  }

  isTokenBlacklisted(token: string): boolean {
    return this.blacklistedTokens.has(token);
  }

  addPermanentUserBan(userId: string, email: string) {
    this.bannedUsers.add(userId);
    this.bannedEmails.add(email.toLowerCase());
    console.log(`User permanently banned: ${email} (ID: ${userId})`);
  }

  isUserBanned(userId: string): boolean {
    return this.bannedUsers.has(userId);
  }

  isEmailBanned(email: string): boolean {
    return this.bannedEmails.has(email.toLowerCase());
  }

  // Clean up old tokens periodically (optional - tokens expire anyway)
  cleanup() {
    // In a production environment, you might want to implement
    // a time-based cleanup of old tokens
  }
}

export const tokenBlacklist = new TokenBlacklist();