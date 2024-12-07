"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Participant {
  id: string;
  name: string;
  phone?: string; // Adicionar propriedade opcional 'phone'
}

export default function CreateGroupPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantPhone, setNewParticipantPhone] = useState(''); // Adicionar estado para o telefone
  const router = useRouter();

  const addParticipant = () => {
    if (newParticipantName.trim() === '') return;

    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim(),
      phone: newParticipantPhone.trim() || undefined, // Armazenar telefone se fornecido
    };

    // Verificar se já existe um participante com esse nome
    if (participants.some(p => p.name.toLowerCase() === newParticipant.name.toLowerCase())) {
      alert('Já existe um participante com este nome!');
      return;
    }

    setParticipants([...participants, newParticipant]);
    setNewParticipantName('');
    setNewParticipantPhone(''); // Limpar campo do telefone após adicionar
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const finishGroup = () => {
    if (participants.length < 3) {
      alert('É necessário ter pelo menos 3 participantes para o sorteio.');
      return;
    }

    // Realizar o sorteio
    const shuffledParticipants = [...participants];
    
    // Algoritmo de Fisher-Yates para embaralhar
    for (let i = shuffledParticipants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
    }

    // Preparar os resultados do sorteio
    const drawResults: { [key: string]: string } = {};
    for (let i = 0; i < shuffledParticipants.length; i++) {
      const currentPerson = shuffledParticipants[i];
      const nextPerson = shuffledParticipants[(i + 1) % shuffledParticipants.length];
      
      drawResults[currentPerson.id] = nextPerson.id;
    }

    // Salvar no localStorage para manter na sessão
    localStorage.setItem('secretSantaGroup', JSON.stringify({
      participants: participants,
      drawResults: drawResults,
      groupId: Date.now().toString()
    }));

    // Navegar para a página de resultados
    router.push('/results');
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Criar Grupo de Amigo Secreto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col mb-4">
            <Input 
              type="text" 
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              placeholder="Nome do participante" 
              className="mb-2"
            />
            <Input
              type="tel"
              value={newParticipantPhone}
              onChange={(e) => setNewParticipantPhone(e.target.value)}
              placeholder="Número de telefone (opcional)"
              className="mb-2"
            />
            <Button onClick={addParticipant}>Adicionar</Button>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Participantes ({participants.length})</h3>
            {participants.length === 0 ? (
              <p className="text-gray-500">Nenhum participante adicionado</p>
            ) : (
              <ul>
                {participants.map(participant => (
                  <li 
                    key={participant.id} 
                    className="flex justify-between items-center bg-gray-100 p-2 rounded mb-2"
                  >
                    {participant.name}
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => removeParticipant(participant.id)}
                    >
                      Remover
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button 
            onClick={finishGroup} 
            disabled={participants.length < 3}
            className="w-full"
          >
            Finalizar Grupo e Sortear
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
