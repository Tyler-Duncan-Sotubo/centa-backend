export declare class PublicJobsDto {
    search?: string;
    location?: string;
    salaryMin?: number;
    salaryMax?: number;
    jobType?: string[];
    employmentType?: string[];
    experienceLevel?: string[];
    locations?: string[];
    status?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
}
