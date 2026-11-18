import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReaderSettingsSheet, useReaderPrefs, useSpeech } from '../../features/reader-view';
import { useConnection } from '../../hooks/useConnection';
import { useMediaQuery, useStoredFlag } from '../../hooks/useMediaQuery';
import { useRooms } from '../../hooks/useRooms';
import * as nexconn from '../../nexconn/client';
import { getLastRoom, setLastRoom, type Session } from '../../session';
import { ComfortRoom } from '../comfort/ComfortRoom';
import { ComfortSidebar } from '../comfort/ComfortSidebar';
import { NewRoomSheet } from './NewRoomSheet';
import { Sidebar } from './Sidebar';
import { StandardRoom } from './StandardRoom';

interface Props {
  session: Session;
  onLogout?: () => void;
  /** Showcase: no sign-out, no remembered layout. */
  embedded?: boolean;
  /** Room to open first (e.g. after following an invite). */
  initialRoom?: string;
}

// The app shell.
// Standard, >= 900px: [ Sidebar | Chat | Info panel ], full window.
// Standard, < 900px:  one pane at a time; the room list is home.
// Comfort:            one room at a time, large cards, "My rooms" button.
export function Workspace({ session, onLogout, embedded = false, initialRoom }: Props) {
  const { prefs } = useReaderPrefs();
  const speech = useSpeech();
  const logout = useMemo(() => onLogout ?? (() => window.location.reload()), [onLogout]);
  const conn = useConnection(session, logout);

  const [activeId, setActiveId] = useState<string>(() => initialRoom ?? getLastRoom(session.userId) ?? session.channelId);
  const { rooms, loaded, refresh, noteMessage } = useRooms(conn.state, activeId);

  const wide = useMediaQuery('(min-width: 900px)');
  // 900-1099px: not enough room for three full panes, so while the info panel
  // is open the sidebar shows as its 64px icon rail.
  const cramped = useMediaQuery('(max-width: 1099px)');
  const [collapsed, setCollapsed] = useStoredFlag(embedded ? 'aangan.showcase.sidebar' : 'aangan.sidebarCollapsed', false);
  const [infoOpenWide, setInfoOpenWide] = useStoredFlag(embedded ? 'aangan.showcase.info' : 'aangan.infoOpen', true);
  const [infoOpenNarrow, setInfoOpenNarrow] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>(initialRoom ? 'chat' : 'list');
  const [readerOpen, setReaderOpen] = useState(false);
  const [newRoomOpen, setNewRoomOpen] = useState(false);

  const select = useCallback(
    (id: string) => {
      setActiveId(id);
      setLastRoom(session.userId, id);
      setMobileView('chat');
      setInfoOpenNarrow(false);
    },
    [session.userId],
  );

  // If the remembered room is gone (or unknown), fall back to the default room.
  useEffect(() => {
    if (!loaded || rooms.length === 0 || rooms.some((r) => r.channelId === activeId)) return;
    setActiveId(rooms.find((r) => r.channelId === session.channelId)?.channelId ?? rooms[0].channelId);
  }, [loaded, rooms, activeId, session.channelId]);

  const activeRoom = rooms.find((r) => r.channelId === activeId);
  const roomName = activeRoom?.name ?? (activeId === session.channelId ? session.channelName : 'Room');
  const comfort = prefs.mode === 'comfort';
  const me = { userId: session.userId, name: session.name };

  async function signOut() {
    setReaderOpen(false);
    speech.stop();
    await nexconn.disconnect().catch(() => undefined);
    logout();
  }

  const sidebar = (fullWidth: boolean) => (
    <Sidebar
      rooms={rooms}
      loaded={loaded}
      activeId={fullWidth ? null : activeId}
      onSelect={select}
      onNewRoom={() => setNewRoomOpen(true)}
      me={me}
      connection={conn.state}
      collapsed={collapsed || (cramped && infoOpenWide)}
      onToggleCollapsed={() => {
        if (cramped && infoOpenWide) {
          setInfoOpenWide(false); // make room for the full sidebar
          setCollapsed(false);
        } else {
          setCollapsed(!collapsed);
        }
      }}
      fullWidth={fullWidth}
    />
  );

  let body;
  if (comfort) {
    // Comfort: rooms always visible on the left (wide), or the list first (phones).
    const comfortList = (fullWidth: boolean) => (
      <ComfortSidebar
        rooms={rooms}
        loaded={loaded}
        activeId={fullWidth ? null : activeId}
        onSelect={select}
        onNewRoom={() => setNewRoomOpen(true)}
        me={me}
        connection={conn.state}
        fullWidth={fullWidth}
      />
    );
    const comfortRoom = (narrow: boolean) => (
      <ComfortRoom
        key={activeId}
        session={session}
        channelId={activeId}
        roomName={roomName}
        connection={conn.state}
        fatal={conn.fatal}
        speech={speech}
        onOpenReader={() => setReaderOpen(true)}
        onSent={noteMessage}
        onBack={narrow ? () => setMobileView('list') : undefined}
        otherUnread={rooms.filter((r) => r.channelId !== activeId).reduce((n, r) => n + r.unread, 0)}
      />
    );
    body = wide ? (
      <>
        {comfortList(false)}
        {comfortRoom(false)}
      </>
    ) : mobileView === 'list' ? (
      comfortList(true)
    ) : (
      comfortRoom(true)
    );
  } else if (wide) {
    body = (
      <>
        {sidebar(false)}
        <StandardRoom
          key={activeId}
          session={session}
          channelId={activeId}
          roomName={roomName}
          connection={conn.state}
          fatal={conn.fatal}
          speech={speech}
          infoOpen={infoOpenWide}
          onToggleInfo={setInfoOpenWide}
          onOpenReader={() => setReaderOpen(true)}
          onSent={noteMessage}
          narrow={false}
        />
      </>
    );
  } else if (mobileView === 'list') {
    body = sidebar(true);
  } else {
    body = (
      <StandardRoom
        key={activeId}
        session={session}
        channelId={activeId}
        roomName={roomName}
        connection={conn.state}
        fatal={conn.fatal}
        speech={speech}
        infoOpen={infoOpenNarrow}
        onToggleInfo={setInfoOpenNarrow}
        onOpenReader={() => setReaderOpen(true)}
        onSent={noteMessage}
        narrow
        onBack={() => setMobileView('list')}
      />
    );
  }

  return (
    <div className="reader-root flex h-dvh w-full overflow-hidden bg-cream" data-reader-mode={prefs.mode} data-text-step={prefs.textStep}>
      {body}
      <ReaderSettingsSheet
        open={readerOpen}
        onClose={() => setReaderOpen(false)}
        onSignOut={embedded ? undefined : signOut}
        speech={speech}
        myName={session.name}
      />
      <NewRoomSheet
        open={newRoomOpen}
        authKey={session.authKey}
        onClose={() => setNewRoomOpen(false)}
        onCreated={async (id) => {
          await refresh();
          select(id);
        }}
      />
    </div>
  );
}
