import { ConfigService } from '@nestjs/config';
import { CreateMessageDto } from '../dto/create-message.dto';
export declare class ContactEmailService {
    private config;
    constructor(config: ConfigService);
    sendContactEmail(dto: CreateMessageDto): Promise<void>;
}
