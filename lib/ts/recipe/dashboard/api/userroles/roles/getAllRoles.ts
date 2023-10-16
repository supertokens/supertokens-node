import { getAllRoles, getPermissionsForRole } from "../../../../userroles";

import { APIFunction, APIInterface, APIOptions } from "../../../types";

type Roles = Array<{ role: string; permissions: string[] }>;

const allRoles: APIFunction = async (
    _: APIInterface,
    __: string,
    ___: APIOptions,
    userContext: any
): Promise<{
    status: "OK";
    roles: Roles;
}> => {
    const response = await getAllRoles(userContext);

    let roles: Roles = [];

    for (let i = 0; i < response.roles.length; i++) {
        const role = response.roles[i];
        try {
            const res = await getPermissionsForRole(role);

            if (res.status === "OK") {
                roles.push({
                    role,
                    permissions: res.permissions,
                });
            }
        } catch (_) {}
    }

    return {
        roles,
        status: "OK",
    };
};

export default allRoles;
