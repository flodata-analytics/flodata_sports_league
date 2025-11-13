import React from 'react';
import { useCollection } from '../hooks/useFirestore';
import TeamForm from '../components/TeamForm';
import PlayerForm from '../components/PlayerForm';

export default function AdminTeamsPlayers() {
  // Fetch teams from Firestore
  const { data: teams = [], loading: teamsLoading, error: teamsError, refetch: refetchTeams } = useCollection('teams', 'name', [], null, { enabled: true });

  // Handler to refresh teams after creation
  const handleTeamCreated = () => {
    refetchTeams && refetchTeams();
  };

  // Handler to refresh teams after player creation (if needed)
  const handlePlayerCreated = () => {
    refetchTeams && refetchTeams();
  };

  return (
    <div className="space-y-8">
      <div>
        <TeamForm onTeamCreated={handleTeamCreated} />
      </div>
      <div>
        {teamsLoading ? (
          <div className="text-gray-500">Loading teams...</div>
        ) : teamsError ? (
          <div className="text-red-500">Error loading teams: {teamsError.message}</div>
        ) : (
          <PlayerForm teams={teams} onPlayerCreated={handlePlayerCreated} />
        )}
      </div>
    </div>
  );
}
