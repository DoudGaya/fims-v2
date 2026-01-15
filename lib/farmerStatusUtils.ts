import prisma from './prisma';

/**
 * Automatically update farmer status based on their farm count
 * @param {string} farmerId - The ID of the farmer to update
 * @returns {Promise<string>} The new status
 */
export async function updateFarmerStatusByFarms(farmerId: string): Promise<string> {
  try {
    // Get farmer's current status and farm count
    const farmer = await prisma.farmer.findUnique({
      where: { id: farmerId },
      select: {
        id: true,
        status: true,
        _count: {
          select: {
            farms: true
          }
        }
      }
    });

    if (!farmer) {
      throw new Error('Farmer not found');
    }

    // Don't update if status is already Validated or Verified (manual statuses)
    if (farmer.status === 'Validated' || farmer.status === 'Verified') {
      return farmer.status;
    }

    // Determine new status based on farm count
    let newStatus = 'Enrolled'; // Default status
    
    if (farmer._count.farms > 0) {
      newStatus = 'FarmCaptured';
    }

    // Update status if it has changed
    if (newStatus !== farmer.status) {
      await prisma.farmer.update({
        where: { id: farmerId },
        data: { 
          status: newStatus,
          updatedAt: new Date()
        }
      });
      
      console.log(`Farmer status updated: ${farmerId} from ${farmer.status} to ${newStatus}`);
    }

    return newStatus;
  } catch (error) {
    console.error('Error updating farmer status:', error);
    return 'Error';
  }
}
