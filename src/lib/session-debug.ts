/**
 * Session Debug Utilities
 * Helpful for monitoring and debugging the current session state
 */

import {
  getSessionData,
  getTokenExpiryTime,
  isTokenExpired,
  getAccessToken,
} from "@/lib/auth-tokens";

export function printSessionInfo() {
  const sessionData = getSessionData();
  const expiryTime = getTokenExpiryTime();
  const isExpired = isTokenExpired();
  const accessToken = getAccessToken();

  console.group("🔐 Current Session Information");

  if (sessionData) {
    console.log("Session Data:", sessionData);
    console.log("User:", {
      id: sessionData.user.id,
      name: sessionData.user.name,
      email: sessionData.user.email,
      status: sessionData.user.status,
      is_system_admin: sessionData.user.is_system_admin,
    });

    const loginDate = new Date(sessionData.loginTime);
    const expiryDate = new Date(sessionData.expiryTime);

    console.log("Timing:", {
      loginTime: loginDate.toISOString(),
      expiryTime: expiryDate.toISOString(),
      expiresInSeconds: sessionData.expiresIn,
    });

    console.log("Tokens:", {
      tokenType: sessionData.tokenType,
      accessToken: accessToken
        ? `${accessToken.substring(0, 20)}...`
        : "No token",
      refreshToken: sessionData.refreshToken
        ? `${sessionData.refreshToken.substring(0, 20)}...`
        : "No token",
    });

    console.log("Token Status:", {
      isExpired,
      expiryTime,
      currentTime: Date.now(),
      timeRemaining: isExpired
        ? "Expired"
        : `${Math.round((sessionData.expiryTime - Date.now()) / 1000)}s`,
    });
  } else {
    console.log("No session data found");
  }

  console.groupEnd();
}

export function getSessionStatus() {
  return {
    hasSession: !!getSessionData(),
    isExpired: isTokenExpired(),
    sessionData: getSessionData(),
    accessToken: getAccessToken() ? "Present" : "Missing",
  };
}

// Make it available in the console globally for debugging
if (typeof window !== "undefined") {
  (window as any).sessionDebug = {
    printSessionInfo,
    getSessionStatus,
  };
  console.log(
    "Session debug utilities available: Call window.sessionDebug.printSessionInfo() or window.sessionDebug.getSessionStatus()",
  );
}
