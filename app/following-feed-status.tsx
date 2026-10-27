"use client";
import LoadingState from "./loading-state";

export default function FollowingFeedStatus({ signedIn, loading, error, empty, followsCount, onRetry, onLogin, onExplore }: {
  signedIn: boolean; loading: boolean; error: string; empty: boolean; followsCount: number;
  onRetry: () => void; onLogin: () => void; onExplore: () => void;
}) {
  if (!signedIn) return <div className="empty-feed"><h1>Your people. Your feed.</h1><p>Log in to watch videos from players you follow.</p><button onClick={onLogin}>Log in</button></div>;
  if (loading && empty) return <LoadingState label="Loading your followed players' videos"/>;
  if (error) return <div className="empty-feed" role="alert"><p>{error}</p><button onClick={onRetry}>Try again</button></div>;
  if (!empty) return null;
  return <div className="empty-feed"><h1>{followsCount ? "Your court is quiet." : "Build your court."}</h1><p>{followsCount ? "The players you follow have no published videos yet." : "Follow players to see their latest videos here."}</p><button onClick={onExplore}>Explore players</button></div>;
}
