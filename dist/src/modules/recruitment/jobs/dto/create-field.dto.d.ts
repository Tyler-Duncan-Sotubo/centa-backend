export declare enum FieldType {
    TEXT = "text",
    TEXTAREA = "textarea",
    FILE = "file",
    DATE = "date",
    SELECT = "select"
}
export declare class CreateFieldDto {
    section: string;
    label: string;
    fieldType: FieldType;
    required?: boolean;
    isVisible?: boolean;
    isEditable?: boolean;
    order?: number;
}
