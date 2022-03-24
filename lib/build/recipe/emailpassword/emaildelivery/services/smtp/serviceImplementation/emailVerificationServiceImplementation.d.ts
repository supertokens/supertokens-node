// @ts-nocheck
import { TypeEmailPasswordEmailDeliveryInput } from "../../../../types";
import { ServiceInterface } from "../../../../../../ingredients/emaildelivery/services/smtp";
import { TypeEmailVerificationEmailDeliveryInput } from "../../../../../emailverification/types";
export default function getServiceInterface(
    emailPasswordServiceImplementation: ServiceInterface<TypeEmailPasswordEmailDeliveryInput>
): ServiceInterface<TypeEmailVerificationEmailDeliveryInput>;
