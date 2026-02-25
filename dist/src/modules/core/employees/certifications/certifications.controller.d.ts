import { CertificationsService } from './certifications.service';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { User } from 'src/common/types/user.type';
import { BaseController } from 'src/common/interceptor/base.controller';
export declare class CertificationsController extends BaseController {
    private readonly certificationsService;
    constructor(certificationsService: CertificationsService);
    create(employeeId: string, dto: CreateCertificationDto, user: User, ip: string): Promise<{
        name: string;
        id: string;
        createdAt: Date;
        employeeId: string;
        authority: string | null;
        licenseNumber: string | null;
        issueDate: string | null;
        expiryDate: string | null;
        documentUrl: string | null;
    }>;
    findAll(id: string): Promise<{
        id: string;
        employeeId: string;
        name: string;
        authority: string | null;
        licenseNumber: string | null;
        issueDate: string | null;
        expiryDate: string | null;
        documentUrl: string | null;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{}>;
    update(id: string, dto: UpdateCertificationDto, user: User, ip: string): Promise<{
        id: string;
        employeeId: string;
        name: string;
        authority: string | null;
        licenseNumber: string | null;
        issueDate: string | null;
        expiryDate: string | null;
        documentUrl: string | null;
        createdAt: Date;
    }>;
    remove(id: string): Promise<{
        deleted: boolean;
        id: string;
    }>;
}
