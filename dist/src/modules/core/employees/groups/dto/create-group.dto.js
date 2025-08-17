"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddGroupMembersDto = exports.CreateGroupMemberDto = exports.CreateGroupDto = exports.MemberRole = exports.GroupType = void 0;
const class_validator_1 = require("class-validator");
var GroupType;
(function (GroupType) {
    GroupType["TEAM"] = "TEAM";
    GroupType["PROJECT"] = "PROJECT";
    GroupType["INTEREST"] = "INTEREST";
    GroupType["SECURITY"] = "SECURITY";
})(GroupType || (exports.GroupType = GroupType = {}));
var MemberRole;
(function (MemberRole) {
    MemberRole["MEMBER"] = "member";
    MemberRole["LEAD"] = "lead";
    MemberRole["MANAGER"] = "manager";
    MemberRole["CONTRACTOR"] = "contractor";
})(MemberRole || (exports.MemberRole = MemberRole = {}));
class CreateGroupDto {
    constructor() {
        this.type = GroupType.TEAM;
    }
}
exports.CreateGroupDto = CreateGroupDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 120),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "slug", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(GroupType),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "parentGroupId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "location", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateGroupDto.prototype, "timezone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    __metadata("design:type", Number)
], CreateGroupDto.prototype, "headcountCap", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateGroupDto.prototype, "members", void 0);
class CreateGroupMemberDto {
    constructor() {
        this.role = MemberRole.MEMBER;
        this.isPrimary = false;
    }
}
exports.CreateGroupMemberDto = CreateGroupMemberDto;
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateGroupMemberDto.prototype, "employeeId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(MemberRole),
    __metadata("design:type", String)
], CreateGroupMemberDto.prototype, "role", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], CreateGroupMemberDto.prototype, "isPrimary", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 120),
    __metadata("design:type", String)
], CreateGroupMemberDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateGroupMemberDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateGroupMemberDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateGroupMemberDto.prototype, "allocationPct", void 0);
class AddGroupMembersDto {
}
exports.AddGroupMembersDto = AddGroupMembersDto;
//# sourceMappingURL=create-group.dto.js.map