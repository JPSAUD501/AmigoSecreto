"use client";

import { useState, useEffect } from 'react'; // Add useEffect
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
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const router = useRouter();

  useEffect(() => {
    const storedGroup = localStorage.getItem('secretSantaGroup');
    if (storedGroup) {
      const group = JSON.parse(storedGroup);
      setParticipants(group.participants);
    }
  }, []);

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
    saveGroup();
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
    saveGroup();
  };

  const startEditing = (participant: Participant) => {
    setEditingParticipantId(participant.id);
    setEditedName(participant.name);
    setEditedPhone(participant.phone || '');
  };

  const saveEdit = (id: string) => {
    setParticipants(participants.map(p => p.id === id ? { ...p, name: editedName, phone: editedPhone || undefined } : p));
    setEditingParticipantId(null);
    setEditedName('');
    setEditedPhone('');
    saveGroup();
  };

  const cancelEdit = () => {
    setEditingParticipantId(null);
    setEditedName('');
    setEditedPhone('');
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
    router.push('/group/result');
  };

  const saveGroup = () => {
    if (participants.length === 0) {
      alert('Adicione pelo menos um participante antes de salvar.');
      return;
    }

    localStorage.setItem('secretSantaGroup', JSON.stringify({
      participants: participants,
      groupId: Date.now().toString()
    }));
  };

  return (
    <div className="max-w-[500px] mx-auto p-4 w-full">
      <Card className="w-full">
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
                    className="flex justify-between items-start bg-gray-100 p-3 rounded mb-2 min-h-[80px] gap-4"
                  >
                    {editingParticipantId === participant.id ? (
                      <>
                        <div className="flex-1 max-w-[60%]">
                          <Input 
                            type="text" 
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="mb-2"
                          />
                          <Input 
                            type="tel" 
                            value={editedPhone}
                            onChange={(e) => setEditedPhone(e.target.value)}
                            className="mb-2"
                          />
                        </div>
                        <div className="flex flex-col gap-2 w-[100px]">
                          <Button size="sm" onClick={() => saveEdit(participant.id)}>Salvar</Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>Cancelar</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 max-w-[60%]">
                          <span className="font-medium block">{participant.name}</span>
                          {participant.phone && (
                          <span className="text-sm text-gray-600 mt-1 block">{participant.phone}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 w-[100px]">
                          <Button size="sm" variant="outline" onClick={() => startEditing(participant)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => removeParticipant(participant.id)}>
                            Remover
                          </Button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2">
            <Button 
              onClick={finishGroup} 
              disabled={participants.length < 3}
              className="w-full"
            >
              Finalizar Grupo e Sortear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
