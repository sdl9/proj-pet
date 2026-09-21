export const WALK_DIALOGUES = {
    intro: [
        {
            speaker: 'Passeio Consciente',
            text: 'Explore a praça e encontre os 5 pontos de cuidado responsável. Use WASD ou as setas para andar e pressione E ou ESPAÇO para interagir.'
        }
    ],

    tutorComCachorro: [
        {
            speaker: 'Tutor com cachorro',
            text: 'Os animais devem usar guia durante o passeio. Ela ajuda a proteger o animal, as pessoas e os outros animais ao redor.'
        }
    ],

    voluntaria: [
        {
            speaker: 'Voluntária FeevalePet',
            text: 'Olá! Somos do Projeto FeevalePet, da Universidade Feevale. Siga o projeto no Instagram: @FeevalePet.'
        }
    ],

    banco: [
        {
            speaker: 'Pessoa no banco',
            text: 'Passeamos bastante. Agora estou deixando meu cachorro descansar e recuperar as energias.'
        }
    ],

    bebedouro: [
        {
            speaker: 'Bebedouro',
            text: 'Os animais devem ter sempre água limpa e fresca disponível, inclusive durante e depois dos passeios.'
        }
    ],

    veterinaria: {
        speaker: 'Veterinária',
        prompt: 'Sobre o que você deseja saber?',
        topics: [
            {
                id: 'guarda',
                label: 'A) Guarda responsável',
                pages: [
                    {
                        speaker: 'Veterinária',
                        text: 'Animais não são presentes nem seres descartáveis. A adoção deve ser pensada com responsabilidade e carinho.'
                    },
                    {
                        speaker: 'Veterinária',
                        text: 'É preciso ter tempo, espaço e condições para cuidar do animal durante toda a vida dele.'
                    }
                ]
            },
            {
                id: 'brincadeiras',
                label: 'B) Importância das brincadeiras',
                pages: [
                    {
                        speaker: 'Veterinária',
                        text: 'Brincadeiras e passeios ajudam os animais a gastar energia, oferecem enriquecimento ambiental e aproximam animal e tutor.'
                    },
                    {
                        speaker: 'Veterinária',
                        text: 'Depois da atividade, o animal também precisa descansar para recuperar as energias.'
                    }
                ]
            },
            {
                id: 'cuidados',
                label: 'C) Cuidados com os animais',
                pages: [
                    {
                        speaker: 'Veterinária',
                        text: 'Todo animal precisa de um local seguro, limpo e protegido da chuva, do frio e do calor.'
                    },
                    {
                        speaker: 'Veterinária',
                        text: 'Água limpa, alimentação adequada, descanso, carinho e acompanhamento veterinário também fazem parte do cuidado.'
                    }
                ]
            }
        ]
    },

    final: [
        {
            speaker: 'Passeio concluído!',
            text: 'Você encontrou todos os pontos da praça e aprendeu atitudes importantes para cuidar dos animais com responsabilidade.'
        }
    ]
};
