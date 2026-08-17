import { assert, assertEquals } from "$std/assert/mod.ts";
import { getGameById } from "./games.ts";
import {
  cancelLobby,
  createLobby,
  getLobbyByCode,
  joinLobby,
  leaveLobby,
  setReady,
  startLobby,
} from "./lobbies.ts";

function makeUser(name: string) {
  return {
    id: `lb_${name}_${crypto.randomUUID().replaceAll("-", "")}`,
    username: `player_${name}`,
    isAnonymous: false,
  };
}

Deno.test("create, join, ready, and start produces a game", () => {
  const host = makeUser("host");
  const guest = makeUser("guest");

  const created = createLobby(host, { timeControlId: "3+2" });
  assert(created.ok);
  if (!created.ok) return;
  const code = created.value.code;
  assertEquals(code.length, 6);

  const joined = joinLobby(guest, code);
  assert(joined.ok);
  if (!joined.ok) return;
  assertEquals(joined.value.members.length, 2);

  const notReady = startLobby(host, code);
  assertEquals(notReady.ok, false);
  if (!notReady.ok) assertEquals(notReady.code, "members_not_ready");

  assert(setReady(guest.id, code, true).ok);
  const started = startLobby(host, code);
  assert(started.ok);
  if (!started.ok) return;
  assertEquals(started.value.status, "started");
  assert(started.value.gameId);

  const game = getGameById(started.value.gameId!);
  assert(game);
  assertEquals(game.matchId, null);
  assertEquals(game.timeControlId, "3+2");
});

Deno.test("capacity and engagement rules are enforced", () => {
  const host = makeUser("cap_h");
  const guest = makeUser("cap_g");
  const third = makeUser("cap_t");

  const created = createLobby(host, {});
  assert(created.ok);
  if (!created.ok) return;
  const code = created.value.code;
  assert(joinLobby(guest, code).ok);

  const full = joinLobby(third, code);
  assertEquals(full.ok, false);
  if (!full.ok) assertEquals(full.code, "lobby_full");

  const secondLobby = createLobby(guest, {});
  assertEquals(secondLobby.ok, false);
  if (!secondLobby.ok) assertEquals(secondLobby.code, "already_engaged");

  const notHost = startLobby(guest, code);
  assertEquals(notHost.ok, false);
  if (!notHost.ok) assertEquals(notHost.code, "not_host");
});

Deno.test("leave transfers host and cancel closes the lobby", () => {
  const host = makeUser("leave_h");
  const guest = makeUser("leave_g");

  const created = createLobby(host, {});
  assert(created.ok);
  if (!created.ok) return;
  const code = created.value.code;
  assert(joinLobby(guest, code).ok);

  const left = leaveLobby(host.id, code);
  assert(left.ok);
  if (!left.ok) return;
  assertEquals(left.value.hostUserId, guest.id);
  assertEquals(left.value.members.length, 1);

  const cancelled = cancelLobby(guest.id, code);
  assert(cancelled.ok);
  assertEquals(getLobbyByCode(code)?.status, "cancelled");
  const rejoin = joinLobby(makeUser("late"), code);
  assertEquals(rejoin.ok, false);
});

Deno.test("guest cannot create or join a rated lobby", () => {
  const guestUser = {
    id: `lb_guest_${crypto.randomUUID().replaceAll("-", "")}`,
    username: null,
    isAnonymous: true,
  };
  const host = makeUser("rated_h");

  const ratedCreate = createLobby(guestUser, { rated: true });
  assertEquals(ratedCreate.ok, false);
  if (!ratedCreate.ok) {
    assertEquals(ratedCreate.code, "rated_requires_registered_user");
  }

  const created = createLobby(host, { rated: true });
  assert(created.ok);
  if (!created.ok) return;
  const join = joinLobby(guestUser, created.value.code);
  assertEquals(join.ok, false);
  if (!join.ok) assertEquals(join.code, "rated_requires_registered_user");
});

Deno.test("host can start a new game after the current one completes", () => {
  const host = makeUser("pa_h");
  const guest = makeUser("pa_g");

  const created = createLobby(host, { colorAssignment: "host_x" });
  assert(created.ok);
  if (!created.ok) return;
  const code = created.value.code;
  assert(joinLobby(guest, code).ok);
  assert(setReady(guest.id, code, true).ok);

  const first = startLobby(host, code);
  assert(first.ok);
  if (!first.ok) return;
  const firstGameId = first.value.gameId!;
  const firstGame = getGameById(firstGameId);
  assert(firstGame);
  assertEquals(firstGame.playerXId, host.id);

  const againWhileActive = startLobby(host, code);
  assertEquals(againWhileActive.ok, false);
  if (!againWhileActive.ok) {
    assertEquals(againWhileActive.code, "game_still_active");
  }

  firstGame.snapshot = {
    ...firstGame.snapshot,
    terminal: { winner: "X", reason: "resign" },
  };
  firstGame.completedAt = Date.now();
  firstGame.result = "a_win";

  const second = startLobby(host, code);
  assert(second.ok);
  if (!second.ok) return;
  assert(second.value.gameId !== firstGameId);
});
