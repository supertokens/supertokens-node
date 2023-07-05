import Head from "next/head";
import React, { useEffect } from "react";
import styles from "../../styles/Home.module.css";
import dynamic from "next/dynamic";
import SuperTokens from "supertokens-auth-react";
import { canHandleRoute, getRoutingComponent } from "supertokens-auth-react/ui";
import { PreBuiltUIList } from "../../config/frontendConfig";

const SuperTokensComponentNoSSR = dynamic<{}>(new Promise((res) => res(() => getRoutingComponent(PreBuiltUIList))), {
    ssr: false,
});

export default function Auth(): JSX.Element {
    useEffect(() => {
        if (canHandleRoute(PreBuiltUIList) === false) {
            SuperTokens.redirectToAuth({
                redirectBack: false,
            });
        }
    }, []);

    return (
        <div className={styles.container}>
            <Head>
                <title>SuperTokens 💫</title>
                <link
                    href="//fonts.googleapis.com/css2?family=Rubik:wght@400&display=swap"
                    rel="stylesheet"
                    type="text/css"
                />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <SuperTokensComponentNoSSR />
            </main>
        </div>
    );
}
