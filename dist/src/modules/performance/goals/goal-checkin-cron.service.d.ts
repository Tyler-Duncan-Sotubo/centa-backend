import { PolicyService } from './goal-policy.service';
export declare class GoalCheckinCronService {
    private readonly policyService;
    private readonly logger;
    constructor(policyService: PolicyService);
    handleGoalCheckins(): Promise<void>;
}
