"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import copyToClipboard from 'clipboard-copy';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Copy, Download, Share2, Check, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Add this import

interface Participant {
  id: string;
  name: string;
  phone?: string;
}

interface SecretSantaGroup {
  participants: Participant[];
  drawResults: { [key: string]: string };
  groupId: string;
}

const getInitials = (name: string) => {
  const names = name.split(' ').filter(n => n.length > 0);
  if (names.length === 1) return names[0].charAt(0).toUpperCase();
  return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};

const getPastelColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 80%, 88%)`;
};

export default function ResultsPage() {
  const router = useRouter(); // Initialize router
  const [group, setGroup] = useState<SecretSantaGroup | null>(null);
  const [copiedLinks, setCopiedLinks] = useState<{ [key: string]: boolean }>({});
  const [redrawn, setRedrawn] = useState(false);
  const [showDrawnParticipants, setShowDrawnParticipants] = useState(false);
  const [displayOrder, setDisplayOrder] = useState<string[]>([]); // Add this line

  useEffect(() => {
    const storedGroup = localStorage.getItem('secretSantaGroup');
    if (storedGroup) {
      const parsedGroup = JSON.parse(storedGroup);
      setGroup(parsedGroup);
      // Initialize display order
      setDisplayOrder(parsedGroup.participants.map((p: Participant) => p.id));
    }
  }, []);

  const getParticipantById = (id: string) => {
    return group?.participants.find(p => p.id === id) || null;
  };

  const generatePersonalLink = (participantId: string) => {
    const participant = getParticipantById(participantId);
    const drawnParticipantId = group?.drawResults[participantId] || '';
    const drawnParticipant = getParticipantById(drawnParticipantId);

    if (!participant || !drawnParticipant) return '';

    const baseUrl = window.location.origin;
    const userEncoded = btoa(encodeURIComponent(participant.name));
    const resultEncoded = btoa(encodeURIComponent(drawnParticipant.name));

    return `${baseUrl}/result?u=${userEncoded}&f=${resultEncoded}`;
  };

  const copyLink = (participantId: string) => {
    const link = generatePersonalLink(participantId);
    copyToClipboard(link);
    
    setCopiedLinks(prev => ({
      ...prev,
      [participantId]: true
    }));

    setTimeout(() => {
      setCopiedLinks(prev => ({
        ...prev,
        [participantId]: false
      }));
    }, 2000);
  };

  const sendWhatsApp = (participantId: string) => {
    const link = generatePersonalLink(participantId);
    const participant = getParticipantById(participantId);
    const phoneNumber = participant?.phone;

    if (!phoneNumber) return;

    const message = 
      `*Amigo Secreto*\n\n` +
      `Olá, *${participant.name}*.\n` +
      `O sorteio do Amigo Secreto foi realizado com sucesso.\n` +
      `Para descobrir quem você tirou, acesse o link abaixo:\n\n` +
      `${link}\n\n` +
      `*Importante:* Este link é pessoal, não compartilhe!`;

    const encodedMessage = encodeURIComponent(message);
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    const whatsappLink = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

    window.open(whatsappLink, '_blank');
  };

  const exportReport = () => {
    if (!group) return;

    const doc = new jsPDF();
    
    doc.setFillColor(50, 50, 50);
    doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('Amigo Secreto', 14, 20);
    doc.setFontSize(12);
    doc.text(`Data do sorteio: ${new Date().toLocaleDateString()}`, 14, 30);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(`Total de participantes: ${group?.participants.length || 0}`, 14, 50);

    // Generate the cycle of names
    const cycle = [];
    let currentParticipantId = group.participants[0].id;

    do {
      const participant = getParticipantById(currentParticipantId);
      if (!participant) break;
      cycle.push(participant.name);
      currentParticipantId = group.drawResults[currentParticipantId];
    } while (currentParticipantId !== group.participants[0].id);

    // Close the cycle by adding the first participant again
    cycle.push(cycle[0]);

    // Create a string representation of the cycle with line breaks
    const cycleString = cycle.join(' > ');
    const cycleLines = doc.splitTextToSize(cycleString, doc.internal.pageSize.width - 28);

    // Add the cycle to the PDF
    doc.setFontSize(14);
    doc.text('Ciclo de Participantes:', 14, 60);
    doc.setFontSize(12);
    doc.text(cycleLines, 14, 70);

    const cycleHeight = doc.getTextDimensions(cycleLines.join(' ')).h * cycleLines.length;
    const tableStartY = 70 + cycleHeight + 5;

    const tableData = group?.participants.map(participant => {
      const drawnParticipantId = group.drawResults[participant.id];
      const drawnParticipant = getParticipantById(drawnParticipantId);
      return [
        participant.name,
        drawnParticipant?.name || ''
      ];
    });

    autoTable(doc, {
      startY: tableStartY,
      head: [['Participante', 'Tirou']],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [50, 50, 50],
        textColor: [255, 255, 255],
        fontSize: 12,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 95 },
        1: { fontStyle: 'bold', cellWidth: 95 }
      },
    });

    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(10);
    doc.setTextColor(100);
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save('amigo-secreto.pdf');
  };

  const sortAgain = () => {
    if (!group) return;
  
    const shuffledParticipants = [...group.participants];
    
    // Fisher-Yates shuffle for draw results
    for (let i = shuffledParticipants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledParticipants[i], shuffledParticipants[j]] = [shuffledParticipants[j], shuffledParticipants[i]];
    }
  
    // Prepare new draw results
    const newDrawResults: { [key: string]: string } = {};
    for (let i = 0; i < shuffledParticipants.length; i++) {
      const currentPerson = shuffledParticipants[i];
      const nextPerson = shuffledParticipants[(i + 1) % shuffledParticipants.length];
      newDrawResults[currentPerson.id] = nextPerson.id;
    }
  
    // Shuffle display order separately
    const newDisplayOrder = [...group.participants.map(p => p.id)];
    for (let i = newDisplayOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDisplayOrder[i], newDisplayOrder[j]] = [newDisplayOrder[j], newDisplayOrder[i]];
    }
    setDisplayOrder(newDisplayOrder);
  
    const newGroup = {
      ...group,
      drawResults: newDrawResults,
      groupId: Date.now().toString(),
    };
  
    localStorage.setItem('secretSantaGroup', JSON.stringify(newGroup));
    setGroup(newGroup);
    setRedrawn(true);
    setTimeout(() => {
      setRedrawn(false);
    }, 3000);
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        {redrawn && (
          <div className="bg-green-100 border-green-500 p-4 mb-4 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            <p className="text-green-700">Sorteio realizado com sucesso!</p>
          </div>
        )}
        <CardHeader>
          <CardTitle>Resultado do Sorteio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-6">
            Compartilhe o link individual com cada participante.
            Cada pessoa só verá quem ela tirou ao acessar seu próprio link.
          </p>
          <div className="grid grid-rows-2 sm:grid-cols-1">
            <Button 
              onClick={sortAgain} 
              variant="secondary" 
              className="w-full"
            >
              Sortear Novamente
            </Button>
            <Button 
              onClick={() => setShowDrawnParticipants(!showDrawnParticipants)} 
              variant="secondary" 
              className="w-full mb-4"
            >
              {showDrawnParticipants ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Ocultar Quem Cada Um Tirou
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Mostrar Quem Cada Um Tirou
                </>
              )}
            </Button>
          </div>

          <div className="space-y-4 mb-6">
            {group && displayOrder.map((participantId) => {
              const participant = group.participants.find(p => p.id === participantId)!;
              return (
                <div 
                  key={participant.id}
                  className="bg-gray-50 p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:justify-between"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto flex-col sm:flex-row">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-gray-800 font-semibold text-lg"
                        style={{ 
                          backgroundColor: getPastelColor(participant.name),
                        }}
                      >
                        {getInitials(participant.name)}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{participant.name}</span>
                        {showDrawnParticipants && (
                          <span className="text-xs text-gray-500 italic">
                            Tirou: {getParticipantById(group.drawResults[participant.id])?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      onClick={() => copyLink(participant.id)}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      {copiedLinks[participant.id] ? (
                        'Copiado!'
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          Copiar Link
                        </>
                      )}
                    </Button>
                    {participant.phone && (
                      <Button
                        size="sm"
                        onClick={() => sendWhatsApp(participant.id)}
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        <Share2 className="w-4 h-4 mr-1" />
                        WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Button 
            onClick={exportReport} 
            className="w-full mb-4"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar Relatório
          </Button>
          <Button 
            onClick={() => router.push('/')} 
            variant="secondary" 
            className="w-full mb-4"
          >
            Voltar e Editar Participantes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}