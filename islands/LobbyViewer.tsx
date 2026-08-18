import { useState, useEffect } from "preact/hooks";

type LobbyInfo = {
    code: string
    options: {
        boardSize: number
        rated: boolean;
        timeControlId: string;
        colorAssignment: string;
    }
    memberCount: number;
    hostUsername: string | null;
};

export default function LobbyViewer() {
    const [lobbies, setLobbies] = useState<LobbyInfo[] | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchLobbies() {
            try {
                const response = await fetch(`/api/lobbies`, {
                    cache: "no-store",
                    credentials: "same-origin",
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                setLobbies(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchLobbies();
    }, []);

    if (loading) {
        return (
            <div class="rounded border border-white/10 bg-white/5 p-4 space-y-4 max-w-xl">
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-bold">Public Lobbies</h2>
                </div>
                <p>Loading lobbies...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div class="rounded border border-white/10 bg-white/5 p-4 space-y-4 max-w-xl">
                <div class="flex items-center justify-between">
                    <h2 class="text-xl font-bold">Public Lobbies</h2>
                </div>
                <p>Error loading lobbies: {error}</p>
            </div>
        );
    }

    return (
        <div class="rounded border border-white/10 bg-white/5 p-4 space-y-4 max-w-xl">
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-bold">Public Lobbies</h2>
            </div>
            {lobbies && lobbies.length > 0 ? (
                <ul class="space-y-2">
                    {lobbies.map((lobby) => (
                        <li key={lobby.code} class="border border-white/10 rounded p-3">
                            <div class="flex justify-between items-center">
                                <span class="font-mono">{lobby.code}</span>
                                <span>{lobby.memberCount} players</span>
                            </div>
                            <div class="text-sm text-gray-300 mt-1">
                                {lobby.hostUsername ? `Host: ${lobby.hostUsername}` : 'No host'}
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No public lobbies available</p>
            )}
        </div>
    );
}