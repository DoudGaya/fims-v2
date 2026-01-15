import prisma from '../prisma';
import ProductionLogger from '../productionLogger';

/**
 * Log SSO authentication attempts for audit and security
 * @param {string} email - User email attempting SSO
 * @param {string} provider - SSO provider (google, microsoft, etc.)
 * @param {string} status - Result status (success, user_not_found, sso_disabled, error)
 * @param {string} reason - Detailed reason for the status
 * @param {object} metadata - Additional metadata (sanitized)
 * @param {string} ipAddress - User's IP address
 * @param {string} userAgent - User's browser agent
 */
export async function logSSOAttempt(
  email: string,
  provider: string,
  status: string,
  reason: string | null = null,
  metadata: any = null,
  ipAddress: string | null = null,
  userAgent: string | null = null
) {
  try {
    // Find user ID if user exists
    let userId: string | null = null;
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      });
      userId = user?.id || null;
    } catch (err) {
      // User doesn't exist, that's okay
    }

    // Log to database
    const auditLog = await prisma.sSOAuditLog.create({
      data: {
        userId,
        email,
        provider,
        status,
        reason,
        metadata: metadata ?? undefined,
        ipAddress,
        userAgent
      }
    });

    // Also log to production logger
    ProductionLogger.info(`SSO attempt [${status}]`, {
      email,
      provider,
      reason,
      userId,
      timestamp: new Date().toISOString()
    });

    return auditLog;
  } catch (error: any) {
    ProductionLogger.error('Failed to log SSO attempt:', {
      email,
      provider,
      error: error.message
    });
    // Don't throw - logging failure shouldn't break auth
  }
}

/**
 * Get SSO audit logs with filtering
 */
export async function getSSOAuditLogs(filters: any = {}) {
  try {
    const { provider, status, email, startDate, endDate, limit = 50, skip = 0 } = filters;

    const where: any = {};
    
    if (provider) where.provider = provider;
    if (status) where.status = status;
    if (email) where.email = { contains: email, mode: 'insensitive' };
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.sSOAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          user: { select: { id: true, email: true, displayName: true } }
        }
      }),
      prisma.sSOAuditLog.count({ where })
    ]);

    return { logs, total };
  } catch (error) {
    console.error('Error fetching SSO audit logs:', error);
    throw error;
  }
}
