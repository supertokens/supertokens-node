import express from "express";
import cors from "cors";
import * as jose from "jose";

const jwks = jose.createRemoteJWKSet(new URL("http://localhost:3001/auth/jwt/jwks.json"));

type VerifiedRequest = express.Request & { session: jose.JWTPayload };

function verifyAccessToken(requiredScope: string) {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let accessToken = req.headers["authorization"]?.replace(/^Bearer /, "");
        if (!accessToken) {
            res.status(401).send("Unauthorized: Invalid access token");
            return;
        }

        try {
            const verify = await jose.jwtVerify(accessToken, jwks, {
                audience: "calendar-service",
                issuer: "http://localhost:3001/auth",
                requiredClaims: ["scp"],
            });
            const scopes = verify.payload.scp as string[];
            if (scopes.includes(requiredScope)) {
                (req as VerifiedRequest).session = verify.payload;
                next();
            } else {
                res.status(403).send(`Forbidden: Missing required scope: ${requiredScope}`);
            }
        } catch (err) {
            if (err.code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
                if (err.claim === "aud") {
                    res.status(403).send("Forbidden: Invalid audience");
                } else if (err.claim === "iss") {
                    res.status(403).send("Forbidden: Invalid issuer");
                } else if (err.claim === "scp") {
                    res.status(403).send("Forbidden: Invalid scope");
                }
            } else if (err.code === "ERR_JWS_INVALID") {
                res.status(401).send("Unauthorized: Invalid access token");
            } else {
                return next(err);
            }
        }
    };
}

const app = express();
app.use(express.json());

app.use(
    cors({
        origin: ["http://localhost:3000", "http://localhost:3001"],
        allowedHeaders: ["content-type"],
        methods: ["GET", "PUT", "POST", "DELETE"],
        credentials: true,
    })
);

// This is a simple in-memory database
let events: { id: number; title: string; description: string; start: number; end: number }[] = [
    {
        id: Date.now(),
        title: "Meeting with A",
        description: "Discuss the project",
        start: Date.now(),
        end: Date.now() + 60 * 60 * 1000,
    },
];

app.get("/event", verifyAccessToken("calendar.read"), (req: express.Request, res: express.Response) => {
    res.send(events);
});

app.post("/event", verifyAccessToken("calendar.write"), (req: express.Request, res: express.Response) => {
    const event = req.body;
    event.id = Date.now();
    events.push(event);
    res.send(event);
});

app.put("/event/:id", verifyAccessToken("calendar.write"), (req: express.Request, res: express.Response) => {
    const eventId = parseInt(req.params.id);
    if (!events.some((event) => event.id === eventId)) {
        res.status(404).send("Not found: event not found");
        return;
    }

    events = events.map((event) => (event.id === eventId ? { ...event, ...req.body, id: eventId } : event));
    res.send(events.find((event) => event.id === eventId));
});

app.delete("/event/:id", verifyAccessToken("calendar.write"), (req: express.Request, res: express.Response) => {
    const eventId = parseInt(req.params.id);
    let eventCount = events.length;
    events = events.filter((event) => event.id !== eventId);
    res.send({ deleted: eventCount !== events.length });
});

app.listen(3011, async () => {
    console.log(`API Server listening on port 3011`);
});
