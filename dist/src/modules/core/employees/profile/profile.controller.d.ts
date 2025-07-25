import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class ProfileController extends BaseController {
    private readonly profileService;
    constructor(profileService: ProfileService);
    create(employeeId: string, dto: CreateProfileDto, user: User, ip: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        country: string | null;
        state: string | null;
        employeeId: string;
        dateOfBirth: string | null;
        gender: string | null;
        maritalStatus: string | null;
        address: string | null;
        phone: string | null;
        emergencyName: string | null;
        emergencyPhone: string | null;
    }>;
    findOne(id: string): Promise<{}>;
    remove(id: string): Promise<{
        deleted: boolean;
        id: string;
    }>;
}
