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
                audience: "note-service",
                issuer: "http://localhost:3001/auth",
                requiredClaims: ["scp"],
            });
            const scopes = verify.payload.scp as string[];
            if (scopes.includes(requiredScope)) {
                (req as VerifiedRequest).session = verify.payload;
                next();
            } else {
                res.status(403).send("Forbidden: Invalid scope");
            }
        } catch (err) {
            if (err.code === "ERR_JWT_CLAIM_VALIDATION_FAILED") {
                if (err.claim === "aud") {
                    res.status(403).send("Forbidden: Invalid audience");
                } else if (err.claim === "iss") {
                    res.status(403).send("Unauthorized: Invalid issuer");
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
let notes: { id: number; title: string; description: string }[] = [
    {
        id: Date.now(),
        title: "Meeting with A",
        description: "Discuss the project",
    },
];

app.get("/note", verifyAccessToken("note.read"), (req: express.Request, res: express.Response) => {
    res.send(notes);
});

app.post("/note", verifyAccessToken("note.write"), (req: express.Request, res: express.Response) => {
    const note = req.body;
    note.id = Date.now();
    notes.push(note);
    res.send(note);
});

app.put("/note/:id", verifyAccessToken("note.write"), (req: express.Request, res: express.Response) => {
    const noteId = parseInt(req.params.id);
    const note = req.body;
    notes = notes.map((note) => (note.id === noteId ? { ...note, ...req.body, id: noteId } : note));
    res.send(note);
});

app.delete("/note/:id", verifyAccessToken("note.write"), (req: express.Request, res: express.Response) => {
    const noteId = parseInt(req.params.id);
    let noteCount = notes.length;
    notes = notes.filter((note) => note.id !== noteId);
    res.send({ deleted: noteCount !== notes.length });
});

app.listen(3012, async () => {
    console.log(`API Server listening on port 3012`);
});
