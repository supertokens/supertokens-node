// @ts-nocheck
import { TypePasswordlessSmsDeliveryInput } from "../../../types";
import * as Twilio from "twilio";
import { ServiceInterface } from "../../../../../ingredients/smsdelivery/services/twilio";
export declare function getServiceImplementation(
    twilioClient: Twilio.Twilio
): ServiceInterface<TypePasswordlessSmsDeliveryInput>;
