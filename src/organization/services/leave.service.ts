import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, gte, lte, or, sql } from 'drizzle-orm';
import { db } from 'src/drizzle/types/drizzle';
import { DRIZZLE } from '../../drizzle/drizzle.module';
import {
  CreateLeaveDto,
  CreateLeaveRequestDto,
  UpdateLeaveDto,
  UpdateLeaveRequestDto,
} from '../dto/leave.dto';
import {
  leave_balance,
  leave_requests,
  leaves,
} from 'src/drizzle/schema/leave-attendance.schema';
import { employees } from 'src/drizzle/schema/employee.schema';
import { AttendanceService } from './attendance.service';
import { PusherService } from 'src/notification/services/pusher.service';
import { users } from 'src/drizzle/schema/users.schema';

@Injectable()
export class LeaveService {
  constructor(
    @Inject(DRIZZLE) private db: db,
    private readonly attendance: AttendanceService,
    private readonly pusher: PusherService,
  ) {}

  async leaveManagement(company_id: string, countryCode: string) {
    const leaveSummary = await this.getLeaveSummary(company_id);
    const holidays =
      await this.attendance.getUpcomingPublicHolidays(countryCode);
    const leaveRequests = await this.getAllCompanyLeaveRequests(company_id);

    return {
      leaveSummary: leaveSummary ?? [],
      holidays: holidays ?? [],
      leaveRequests: leaveRequests ?? [],
    };
  }

  async createLeave(company_id: string, dto: CreateLeaveDto) {
    const { leave_type, leave_entitlement } = dto;

    // Check if leave type already exists for the company
    const existingLeave = await this.db
      .select()
      .from(leaves)
      .where(
        and(
          eq(leaves.leave_type, leave_type),
          eq(leaves.company_id, company_id),
        ),
      )
      .execute();
    if (existingLeave.length > 0) {
      throw new BadRequestException(
        `${leave_type} Leave already exists for your company.`,
      );
    }

    try {
      await this.db
        .insert(leaves)
        .values({
          leave_type,
          leave_entitlement,
          company_id,
        })
        .execute();

      return 'Leave created successfully';
    } catch (error) {
      throw new BadRequestException(
        'Error creating leave. Please check your input and try again.' + error,
      );
    }
  }

  async getLeaves(company_id: string) {
    try {
      const leave = await this.db
        .select()
        .from(leaves)
        .where(eq(leaves.company_id, company_id))
        .execute();

      return leave;
    } catch (error) {
      throw new BadRequestException(
        'Error fetching leave. Please check your input and try again.' + error,
      );
    }
  }

  async getLeaveSummary(company_id: string) {
    try {
      // 1. Get total number of employees
      const totalEmployees = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(employees)
        .where(eq(employees.company_id, company_id))
        .then((res) => res[0].count);

      // 2. Get all leave types for the company
      const leaveTypes = await this.db
        .select({
          id: leaves.id,
          leave_type: leaves.leave_type,
          entitlement: leaves.leave_entitlement,
        })
        .from(leaves)
        .where(eq(leaves.company_id, company_id));

      // 3. Get used leave days grouped by leave type
      const usedLeaves = await this.db
        .select({
          leave_type: leave_balance.leave_type,
          used: sql<number>`SUM(${leave_balance.used_leave_days})`.as('used'),
        })
        .from(leave_balance)
        .innerJoin(employees, eq(leave_balance.employee_id, employees.id))
        .where(eq(employees.company_id, company_id))
        .groupBy(leave_balance.id);

      // 4. Merge data
      const summary = leaveTypes.map((leave) => {
        const used =
          usedLeaves.find(
            (usedLeave) => usedLeave.leave_type === leave.leave_type,
          )?.used ?? 0;

        return {
          leave_type: leave.leave_type,
          leave_entitlement: leave.entitlement * totalEmployees,
          used,
        };
      });

      return summary;
    } catch (error) {
      throw new BadRequestException('Error fetching leave summary: ' + error);
    }
  }

  async getLeaveById(id: string) {
    try {
      const leave = await this.db
        .select()
        .from(leaves)
        .where(eq(leaves.id, id))
        .execute();

      return leave;
    } catch (error) {
      throw new BadRequestException(
        'Error fetching leave. Please check your input and try again.' + error,
      );
    }
  }

  async updateLeave(id: string, dto: UpdateLeaveDto) {
    const { leave_type, leave_entitlement } = dto;

    try {
      await this.db
        .update(leaves)
        .set({
          leave_type,
          leave_entitlement,
        })
        .where(eq(leaves.id, id))
        .execute();

      return 'Leave updated successfully';
    } catch (error) {
      throw new BadRequestException(
        'Error updating leave. Please check your input and try again.' + error,
      );
    }
  }

  async deleteLeave(id: string) {
    try {
      await this.db.delete(leaves).where(eq(leaves.id, id)).execute();

      return 'Leave deleted successfully';
    } catch (error) {
      throw new BadRequestException(
        'Error deleting leave. Please check your input and try again.' + error,
      );
    }
  }

  // Leave Request
  async createLeaveRequest(employee_id: string, dto: CreateLeaveRequestDto) {
    const { leave_type, start_date, end_date, total_days_off, notes } = dto;

    // Step 1: Check for overlapping leave requests
    const existingRequest = await this.db
      .select()
      .from(leave_requests)
      .where(
        and(
          eq(leave_requests.employee_id, employee_id),
          eq(leave_requests.leave_type, leave_type),
          or(
            and(
              lte(leave_requests.start_date, end_date),
              gte(leave_requests.end_date, start_date),
            ),
            and(
              gte(leave_requests.start_date, start_date),
              lte(leave_requests.end_date, end_date),
            ),
          ),
        ),
      )
      .execute();

    if (existingRequest.length > 0) {
      throw new BadRequestException(
        `You already have an active leave request for the same leave type during the specified period.`,
      );
    }

    // Step 2: Fetch employee's leave balance
    const [balance] = await this.db
      .select({
        remaining_days: leave_balance.remaining_leave_days,
      })
      .from(leave_balance)
      .where(
        and(
          eq(leave_balance.employee_id, employee_id),
          eq(leave_balance.leave_type, leave_type),
        ),
      )
      .execute();

    console.log('Balance:', balance);
    console.log('Total Days Off:', total_days_off);

    if (balance) {
      if (
        balance.remaining_days === null ||
        balance.remaining_days < total_days_off
      ) {
        throw new BadRequestException(
          `You only have ${balance.remaining_days} day(s) left for ${leave_type}, but requested ${total_days_off}.`,
        );
      }
    }

    // Step 3: Fetch company leave entitlement
    const [employee] = await this.db
      .select({
        company_id: employees.company_id,
        employee_name: employees.first_name,
        employee_last_name: employees.last_name,
      })
      .from(employees)
      .where(eq(employees.id, employee_id))
      .execute();

    if (!employee) {
      throw new BadRequestException(`Employee not found.`);
    }

    const [entitlement] = await this.db
      .select({
        allowed_days: leaves.leave_entitlement,
      })
      .from(leaves)
      .where(
        and(
          eq(leaves.company_id, employee.company_id),
          eq(leaves.leave_type, leave_type),
        ),
      )
      .execute();

    if (!entitlement) {
      throw new BadRequestException(
        `Leave entitlement not found for ${leave_type} in your company.`,
      );
    }

    if (total_days_off > entitlement.allowed_days) {
      throw new BadRequestException(
        `Requested days (${total_days_off}) exceed your company's allowed entitlement of ${entitlement.allowed_days} day(s) for ${leave_type}.`,
      );
    }

    // Step 4: Insert the new leave request
    try {
      await this.db
        .insert(leave_requests)
        .values({
          employee_id,
          leave_type,
          start_date,
          end_date,
          total_days_off,
          notes,
          leave_status: 'pending',
        })
        .execute();

      // Step 5: Notify employer
      await this.pusher.createNotification(
        employee.company_id,
        `New Leave Request by ${employee.employee_name} ${employee.employee_last_name} for ${leave_type}`,
        'leave',
      );

      return 'Leave request created successfully';
    } catch (error) {
      throw new BadRequestException(
        'Error creating leave request. Please check your input and try again. ' +
          error,
      );
    }
  }

  async getAllCompanyLeaveRequests(company_id: string) {
    try {
      const leaveRequests = await this.db
        .select({
          id: leave_requests.id,
          leave_type: leave_requests.leave_type,
          start_date: leave_requests.start_date,
          end_date: leave_requests.end_date,
          leave_status: leave_requests.leave_status,
          total_days_off: leave_requests.total_days_off,
          employee_id: leave_requests.employee_id,
          employee_name: employees.first_name,
          employee_last_name: employees.last_name,
          approved_by: leave_requests.approved_by,
        })
        .from(leave_requests)
        .leftJoin(employees, eq(leave_requests.employee_id, employees.id))
        .where(eq(employees.company_id, company_id))
        .execute();

      return leaveRequests;
    } catch (error) {
      throw new BadRequestException(
        'Error fetching leave requests. Please check your input and try again. ' +
          error,
      );
    }
  }

  async getEmployeeRequests(employee_id: string) {
    try {
      const leaveRequests = await this.db
        .select()
        .from(leave_requests)
        .where(eq(leave_requests.employee_id, employee_id))
        .execute();

      return leaveRequests;
    } catch (error) {
      throw new BadRequestException(
        'Error fetching leave requests. Please check your input and try again.' +
          error,
      );
    }
  }

  async getLeaveRequestById(id: string) {
    try {
      const leaveRequest = await this.db
        .select()
        .from(leave_requests)
        .where(eq(leave_requests.id, id))
        .execute();

      return leaveRequest[0];
    } catch (error) {
      throw new BadRequestException(
        'Error fetching leave request. Please check your input and try again.' +
          error,
      );
    }
  }

  async updateLeaveRequest(id: string, dto: UpdateLeaveRequestDto) {
    // get the existing leave request
    const [existingRequest] = await this.db
      .select()
      .from(leave_requests)
      .where(eq(leave_requests.id, id))
      .execute();

    if (!existingRequest) {
      throw new NotFoundException('Leave request not found');
    }

    try {
      await this.db
        .update(leave_requests)
        .set({
          leave_type: dto.leave_type,
          start_date: dto.start_date,
          end_date: dto.end_date,
          total_days_off: dto.total_days_off,
          notes: dto.notes,
        })
        .where(eq(leave_requests.id, id))
        .execute();

      return 'Leave request updated successfully';
    } catch (error) {
      throw new BadRequestException(
        'Error updating leave request. Please check your input and try again.' +
          error,
      );
    }
  }

  async approveLeaveRequest(id: string, user_id: string) {
    try {
      // Step 1: Fetch the leave request
      const [request] = await this.db
        .select()
        .from(leave_requests)
        .where(eq(leave_requests.id, id))
        .execute();

      if (!request) {
        throw new NotFoundException('Leave request not found');
      }

      const { employee_id, leave_type, total_days_off } = request;

      // Step 2: Fetch employee to get company_id
      const [employee] = await this.db
        .select({ company_id: employees.company_id })
        .from(employees)
        .where(eq(employees.id, employee_id))
        .execute();

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      const { company_id } = employee;

      // Step 3: Fetch leave_entitlement for this leave_type and company
      const [entitlement] = await this.db
        .select({ leave_entitlement: leaves.leave_entitlement })
        .from(leaves)
        .where(
          and(
            eq(leaves.leave_type, leave_type),
            eq(leaves.company_id, company_id),
          ),
        )
        .execute();

      if (!entitlement) {
        throw new NotFoundException(
          'Leave entitlement not defined for this type and company',
        );
      }

      const totalEntitled = Number(entitlement.leave_entitlement);

      // Step 4: Approve leave request
      await this.db
        .update(leave_requests)
        .set({
          leave_status: 'approved',
          approved_by: user_id,
        })
        .where(eq(leave_requests.id, id))
        .execute();

      // Step 5: Fetch or create/update leave balance
      const [balance] = await this.db
        .select()
        .from(leave_balance)
        .where(
          and(
            eq(leave_balance.employee_id, employee_id),
            eq(leave_balance.leave_type, leave_type),
          ),
        )
        .execute();

      const used = Number(balance?.used_leave_days ?? 0);
      const daysOff = Number(total_days_off ?? 0);
      const updatedUsed = used + daysOff;
      const updatedRemaining = Math.max(totalEntitled - updatedUsed, 0);

      if (balance) {
        // Update balance
        await this.db
          .update(leave_balance)
          .set({
            used_leave_days: updatedUsed,
            remaining_leave_days: updatedRemaining,
            total_leave_days: totalEntitled,
          })
          .where(eq(leave_balance.id, balance.id))
          .execute();
      } else {
        // Insert new balance
        await this.db
          .insert(leave_balance)
          .values({
            employee_id,
            leave_type,
            total_leave_days: totalEntitled,
            used_leave_days: updatedUsed,
            remaining_leave_days: updatedRemaining,
          })
          .execute();
      }

      await this.pusher.createNotification(
        company_id,
        `Leave request for ${leave_type} has been approved.`,
        'leave',
      );

      return 'Leave request approved and leave balance updated successfully';
    } catch (error) {
      throw new BadRequestException('Error approving leave request. ' + error);
    }
  }

  async rejectLeaveRequest(id: string, user_id: string) {
    try {
      await this.db
        .update(leave_requests)
        .set({
          leave_status: 'rejected',
          approved_by: user_id,
        })
        .where(eq(leave_requests.id, id))
        .execute();

      // Fetch the leave request to get employee_id and company_id

      const [user] = await this.db
        .select({
          company_id: users.company_id,
        })
        .from(users)
        .where(eq(users.id, user_id))
        .execute();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.pusher.createNotification(
        user.company_id ?? '',
        `Leave request rejected.`,
        'leave',
      );

      return 'Leave request rejected successfully';
    } catch (error) {
      throw new BadRequestException(
        'Error rejecting leave request. Please check your input and try again.' +
          error,
      );
    }
  }

  // Assuming you're using a database query to fetch both `leave_balance` and `leaves` tables
  async getLeaveBalance(employee_id: string) {
    try {
      // Fetch leave balance for the employee
      const leaveBalance = await this.db
        .select()
        .from(leave_balance)
        .where(eq(leave_balance.employee_id, employee_id))
        .execute();

      // Fetch leave entitlement from the company's leave types (leaves table)
      const leaveEntitlements = await this.db
        .select()
        .from(leaves) // Assuming this table holds the company's leave entitlement
        .execute();

      // Combine the employee's leave balance with their entitlement
      const leaveSummary = leaveEntitlements.map((leave) => {
        // Find the matching employee's leave balance for the same leave type
        const matchedLeaveBalance = leaveBalance.find(
          (balance) => balance.leave_type === leave.leave_type,
        );

        // Calculate the `used` leave (total used leave days)
        const used = matchedLeaveBalance?.used_leave_days || 0;

        // Calculate the `remaining` leave (total remaining leave days)
        const remaining = matchedLeaveBalance?.remaining_leave_days || 0;

        return {
          leave_type: leave.leave_type,
          leave_entitlement: leave.leave_entitlement,
          used,
          remaining,
          total: leave.leave_entitlement, // Total entitlement from company
        };
      });

      return leaveSummary;
    } catch (error) {
      throw new BadRequestException(
        'Error fetching leave balance. Please check your input and try again.' +
          error,
      );
    }
  }
}
