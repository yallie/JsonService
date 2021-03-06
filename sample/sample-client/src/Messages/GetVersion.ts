import { IReturn } from 'json-services-client'
import { GetVersionResponse } from './GetVersionResponse'

export class GetVersion implements IReturn<GetVersionResponse> {
    public IsInternal!: boolean
    public getTypeName() {
        // return "Ultima.VersionChecker";
        return "JsonServices.Tests.Messages.GetVersion"
    }
    public createResponse() {
        return new GetVersionResponse();
    }
}

