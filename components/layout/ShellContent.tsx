"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { ActiveCall } from "@/components/call/ActiveCall";
import { IncomingCall } from "@/components/call/IncomingCall";
import { CookieLoader } from "@/components/effects/CookieLoader";
import { FxHost } from "@/components/effects/Particles";
import { ScreenStack } from "@/components/layout/ScreenStack";
import { TabBar } from "@/components/layout/TabBar";
import { CallsScreen } from "@/screens/CallsScreen";
import { ChatScreen } from "@/screens/ChatScreen";
import { CreateScreen } from "@/screens/CreateScreen";
import { DiscoverScreen } from "@/screens/DiscoverScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { MeScreen } from "@/screens/MeScreen";
import { OnboardingScreen } from "@/screens/OnboardingScreen";
import { SignInScreen } from "@/screens/SignInScreen";
import { WelcomeScreen } from "@/screens/WelcomeScreen";
import { SheetHost } from "@/sheets/SheetHost";
import { useNav } from "@/lib/nav";
import { sfx } from "@/lib/sfx";
import { getState, setState, useAppState, useHydrated } from "@/lib/store";
import { refillIfNewDay } from "@/lib/credits";

export function ShellContent(): React.JSX.Element {
  const state = useAppState(); const hydrated = useHydrated(); const nav = useNav();
  const [booted, setBooted] = useState(false);
  const finishBoot = useCallback(() => setBooted(true), []);
  useEffect(() => {
    sfx.setEnabled(state.settings.sounds);
    document.documentElement.dataset.reduce = state.settings.reduceMotion ? "1" : "0";
  }, [state.settings.sounds, state.settings.reduceMotion]);
  useEffect(() => {
    const refreshCredits = () => {
      const current = getState();
      const refreshed = refillIfNewDay(current);
      if (refreshed !== current) setState(() => refreshed);
    };
    refreshCredits();
    const timer = window.setInterval(refreshCredits, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const unlock = () => sfx.unlock();
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => document.removeEventListener("pointerdown", unlock);
  }, []);
  const unread = useMemo(() => Object.values(state.chats).reduce((sum, chat) => sum + chat.unread, 0), [state.chats]);
  const renderRoute = (route: (typeof nav.stack)[number]) => route.name === "chat" ? <ChatScreen characterId={route.characterId}/> : <CreateScreen/>;
  const activeTab = nav.tab === "chats" ? <HomeScreen/> : nav.tab === "discover" ? <DiscoverScreen/> : nav.tab === "calls" ? <CallsScreen/> : <MeScreen/>;
  const stageScreen = state.stage === "welcome" ? <WelcomeScreen/> : state.stage === "signin" ? <SignInScreen/> : state.stage === "onboarding" ? <OnboardingScreen/> : null;
  return <div className="app-shell" aria-label="Cookie AI companion app">
    <div className="mesh-bg"/><div className="paper-grain"/>
    {!hydrated || !booted ? <CookieLoader onDone={finishBoot}/> : <AnimatePresence mode="wait" initial={false}>{stageScreen ? <div key={state.stage} className="absolute inset-0">{stageScreen}</div> : <div key="main" className="absolute inset-0">
      {nav.stack.length ? <ScreenStack stack={nav.stack} render={renderRoute} onBack={nav.pop}/> : activeTab}
      {nav.stack.length === 0 && <TabBar tab={nav.tab} onTab={nav.setTab} onCreate={() => nav.push({ name: "create" })} unread={unread}/>}
    </div>}</AnimatePresence>}
    {hydrated && booted && <><IncomingCall/><ActiveCall/><SheetHost/><FxHost/></>}
  </div>;
}
