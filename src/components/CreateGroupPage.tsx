"use client";

import { useState, useEffect } from 'react'; // Add useEffect
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Settings } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  phone?: string; // Adicionar propriedade opcional 'phone'
  blacklist?: string[]; // IDs de participantes que não podem ser sorteados
}

export default function CreateGroupPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [newParticipantPhone, setNewParticipantPhone] = useState(''); // Adicionar estado para o telefone
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
  const [currentBlacklistParticipant, setCurrentBlacklistParticipant] = useState<Participant | null>(null);
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

  const openBlacklistDialog = (participant: Participant) => {
    setCurrentBlacklistParticipant(participant);
    setBlacklistDialogOpen(true);
  };

  const toggleBlacklist = (participantId: string, blacklistedId: string) => {
    setParticipants(participants.map(p => {
      if (p.id === participantId) {
        const currentBlacklist = p.blacklist || [];
        const newBlacklist = currentBlacklist.includes(blacklistedId)
          ? currentBlacklist.filter(id => id !== blacklistedId)
          : [...currentBlacklist, blacklistedId];
        return { ...p, blacklist: newBlacklist };
      }
      return p;
    }));
  };

  const closeBlacklistDialog = () => {
    setBlacklistDialogOpen(false);
    setCurrentBlacklistParticipant(null);
    saveGroup();
  };

  const performDraw = (): { [key: string]: string } | null => {
    const maxAttempts = 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const shuffled = [...participants];
      
      // Algoritmo de Fisher-Yates para embaralhar
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Tentar criar o sorteio circular
      const drawResults: { [key: string]: string } = {};
      let valid = true;
      
      for (let i = 0; i < shuffled.length; i++) {
        const currentPerson = shuffled[i];
        const nextPerson = shuffled[(i + 1) % shuffled.length];
        
        // Verificar se a pessoa pode tirar a próxima
        const blacklist = currentPerson.blacklist || [];
        if (blacklist.includes(nextPerson.id)) {
          valid = false;
          break;
        }
        
        drawResults[currentPerson.id] = nextPerson.id;
      }
      
      if (valid) {
        return drawResults;
      }
    }
    
    return null;
  };

  const finishGroup = () => {
    if (participants.length < 3) {
      alert('É necessário ter pelo menos 3 participantes para o sorteio.');
      return;
    }

    // Realizar o sorteio com blacklist
    const drawResults = performDraw();
    
    if (!drawResults) {
      alert('Não foi possível realizar o sorteio com as restrições atuais. Por favor, revise as listas de exclusão (blacklists) dos participantes.');
      return;
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
                          {participant.blacklist && participant.blacklist.length > 0 && (
                            <span className="text-xs text-gray-500 mt-1 block">
                              Restrições: {participant.blacklist.length}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 w-[100px]">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openBlacklistDialog(participant)}
                            title="Configurar restrições"
                          >
                            <Settings className="w-4 h-4 mr-1" />
                            Config
                          </Button>
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

      {/* Blacklist Dialog */}
      <Dialog open={blacklistDialogOpen} onOpenChange={setBlacklistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Restrições</DialogTitle>
            <DialogDescription>
              Selecione as pessoas que <strong>{currentBlacklistParticipant?.name}</strong> NÃO pode sortear.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {participants
              .filter(p => p.id !== currentBlacklistParticipant?.id)
              .map(participant => {
                const isBlacklisted = currentBlacklistParticipant?.blacklist?.includes(participant.id) || false;
                return (
                  <div 
                    key={participant.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                    onClick={() => toggleBlacklist(currentBlacklistParticipant!.id, participant.id)}
                  >
                    <span className="font-medium">{participant.name}</span>
                    <input 
                      type="checkbox" 
                      checked={isBlacklisted}
                      onChange={() => {}}
                      className="w-5 h-5 cursor-pointer"
                    />
                  </div>
                );
              })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={closeBlacklistDialog}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
