// @ts-nocheck
import { TypeThirdPartyPasswordlessEmailDeliveryInput } from "../../../../types";
import { ServiceInterface } from "../../../../../../ingredients/emaildelivery/services/smtp";
import { TypeEmailVerificationEmailDeliveryInput } from "../../../../../emailverification/types";
export default function getServiceInterface(
    thirdpartyPasswordlessServiceImplementation: ServiceInterface<TypeThirdPartyPasswordlessEmailDeliveryInput>
): ServiceInterface<TypeEmailVerificationEmailDeliveryInput>;
