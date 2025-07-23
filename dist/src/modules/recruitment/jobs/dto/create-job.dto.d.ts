export declare enum JobType {
    ONSITE = "onsite",
    REMOTE = "remote",
    HYBRID = "hybrid"
}
export declare enum EmploymentType {
    PERMANENT = "permanent",
    TEMPORARY = "temporary",
    CONTRACT = "contract",
    INTERNSHIP = "internship",
    FREELANCE = "freelance",
    PART_TIME = "part_time",
    FULL_TIME = "full_time"
}
export declare class CreateJobDto {
    pipelineTemplateId: string;
    title: string;
    deadlineDate: string;
    country?: string;
    state?: string;
    city?: string;
    jobType: JobType;
    employmentType: EmploymentType;
    salaryRangeFrom: number;
    salaryRangeTo: number;
    currency: string;
    experienceLevel?: string;
    yearsOfExperience?: string;
    qualification?: string;
    description?: string;
    responsibilities?: string[];
    requirements?: string[];
    benefits?: string[];
    externalJobId?: string;
}
