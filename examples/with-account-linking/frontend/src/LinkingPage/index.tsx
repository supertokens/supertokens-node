import { useSessionContext } from "supertokens-auth-react/recipe/session";
import { SignInAndUp } from "supertokens-auth-react/recipe/thirdpartyemailpassword/prebuiltui";
import { ThirdpartyEmailPasswordComponentsOverrideProvider } from "supertokens-auth-react/recipe/thirdpartyemailpassword";
import React from "react";

export const LinkingPage: React.FC = () => {
    const sessionContext = useSessionContext();

    if (sessionContext.loading === true) {
        return null;
    }

    return (
        <div className="fill" id="home-container">
            <ThirdpartyEmailPasswordComponentsOverrideProvider components={{}}>
                <SignInAndUp redirectOnSessionExists={false} />
            </ThirdpartyEmailPasswordComponentsOverrideProvider>
        </div>
    );
};
