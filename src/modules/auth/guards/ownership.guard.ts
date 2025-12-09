import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Observable } from "rxjs";

@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = (request as { user: { sub: string } }).user;
    const resourceId = (request as { params: { id: string } }).params.id; // Assuming the resource ID is in the route params

    // In a real implementation, you would fetch the resource from the database
    // and check if `user.id` matches the resource's owner ID.
    // e.g., const resource = await this.resourceService.findOne(resourceId);
    // return user.id === resource.userId;

    console.log(
      `[OwnershipGuard] User ${user.sub} attempting to access resource ${resourceId}.`,
    );
    // Placeholder logic: allow access for demonstration.
    // Replace with actual ownership check.
    return true;
  }
}
