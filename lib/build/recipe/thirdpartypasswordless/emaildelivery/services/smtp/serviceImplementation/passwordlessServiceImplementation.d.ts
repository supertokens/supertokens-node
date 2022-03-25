// @ts-nocheck
import { TypeThirdPartyPasswordlessEmailDeliveryInput } from "../../../../types";
import { ServiceInterface } from "../../../../../../ingredients/emaildelivery/services/smtp";
import { TypePasswordlessEmailDeliveryInput } from "../../../../../passwordless/types";
export default function getServiceInterface(
    passwordlessServiceImplementation: ServiceInterface<TypeThirdPartyPasswordlessEmailDeliveryInput>
): ServiceInterface<TypePasswordlessEmailDeliveryInput>;
