export declare class CreateOfficeLocationDto {
    location_name: string;
    latitude: string;
    longitude: string;
    address: string;
}
declare const UpdateOfficeLocationDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateOfficeLocationDto>>;
export declare class UpdateOfficeLocationDto extends UpdateOfficeLocationDto_base {
}
export declare class CreateEmployeeLocationDto {
    employee_id: string;
    location_name: string;
    latitude: string;
    longitude: string;
    address: string;
    created_at?: string;
    updated_at?: string;
}
declare const UpdateEmployeeLocationDto_base: import("@nestjs/mapped-types").MappedType<Partial<CreateEmployeeLocationDto>>;
export declare class UpdateEmployeeLocationDto extends UpdateEmployeeLocationDto_base {
}
export {};
