declare const JwtGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class JwtGuard extends JwtGuard_base {
    constructor();
    handleRequest(err: any, user: any, info: {
        name: string;
    }): any;
}
export {};
