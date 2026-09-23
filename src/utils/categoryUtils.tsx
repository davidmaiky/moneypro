import React from 'react';
import {
  Briefcase,
  Laptop,
  TrendingUp,
  PlusCircle,
  Home,
  ShoppingCart,
  Car,
  UtensilsCrossed,
  Smartphone,
  HeartPulse,
  Tv,
  GraduationCap,
  Shirt,
  CreditCard,
  CircleEllipsis,
  Coffee,
  Plane,
  Fuel,
  Dumbbell,
  BookOpen,
  Music,
  Film,
  Wrench,
  Baby,
  PawPrint,
  Landmark,
  PiggyBank,
  Gift,
  Tag,
  DollarSign,
  Bus,
  Bike,
  Scissors,
  Gamepad2,
  Sparkles,
  Receipt,
  Lightbulb,
  Wifi,
  Package,
  ShoppingBag,
  LucideIcon,
} from 'lucide-react';

export interface CategoryIconOption {
  name: string;
  label: string;
  icon: LucideIcon;
  categoryGroup: 'general' | 'lifestyle' | 'home' | 'transport' | 'work_finance';
}

export const CATEGORY_ICONS: CategoryIconOption[] = [
  // Trabalho & Finanças
  { name: 'Briefcase', label: 'Trabalho / Salário', icon: Briefcase, categoryGroup: 'work_finance' },
  { name: 'Laptop', label: 'Freelance / Tech', icon: Laptop, categoryGroup: 'work_finance' },
  { name: 'TrendingUp', label: 'Investimentos', icon: TrendingUp, categoryGroup: 'work_finance' },
  { name: 'Landmark', label: 'Banco / Finanças', icon: Landmark, categoryGroup: 'work_finance' },
  { name: 'PiggyBank', label: 'Poupança / Reserva', icon: PiggyBank, categoryGroup: 'work_finance' },
  { name: 'DollarSign', label: 'Dinheiro', icon: DollarSign, categoryGroup: 'work_finance' },
  { name: 'Receipt', label: 'Contas / Boletos', icon: Receipt, categoryGroup: 'work_finance' },
  { name: 'CreditCard', label: 'Cartão', icon: CreditCard, categoryGroup: 'work_finance' },

  // Casa & Utilidades
  { name: 'Home', label: 'Moradia / Aluguel', icon: Home, categoryGroup: 'home' },
  { name: 'Lightbulb', label: 'Energia Elétrica', icon: Lightbulb, categoryGroup: 'home' },
  { name: 'Wifi', label: 'Internet / Wi-Fi', icon: Wifi, categoryGroup: 'home' },
  { name: 'Wrench', label: 'Manutenção / Reforma', icon: Wrench, categoryGroup: 'home' },

  // Alimentação & Compras
  { name: 'ShoppingCart', label: 'Supermercado', icon: ShoppingCart, categoryGroup: 'lifestyle' },
  { name: 'UtensilsCrossed', label: 'Restaurante / Delivery', icon: UtensilsCrossed, categoryGroup: 'lifestyle' },
  { name: 'Coffee', label: 'Cafeteria / Lanches', icon: Coffee, categoryGroup: 'lifestyle' },
  { name: 'ShoppingBag', label: 'Compras Gerais', icon: ShoppingBag, categoryGroup: 'lifestyle' },
  { name: 'Shirt', label: 'Vestuário / Roupas', icon: Shirt, categoryGroup: 'lifestyle' },
  { name: 'Gift', label: 'Presentes / Doações', icon: Gift, categoryGroup: 'lifestyle' },
  { name: 'Package', label: 'Entregas / Encomendas', icon: Package, categoryGroup: 'lifestyle' },

  // Transporte
  { name: 'Car', label: 'Carro / Automóvel', icon: Car, categoryGroup: 'transport' },
  { name: 'Fuel', label: 'Combustível', icon: Fuel, categoryGroup: 'transport' },
  { name: 'Bus', label: 'Transporte Público', icon: Bus, categoryGroup: 'transport' },
  { name: 'Bike', label: 'Bicicleta / Mobilidade', icon: Bike, categoryGroup: 'transport' },
  { name: 'Plane', label: 'Viagens / Voos', icon: Plane, categoryGroup: 'transport' },

  // Lazer, Saúde & Outros
  { name: 'HeartPulse', label: 'Saúde & Farmácia', icon: HeartPulse, categoryGroup: 'lifestyle' },
  { name: 'Dumbbell', label: 'Academia & Esportes', icon: Dumbbell, categoryGroup: 'lifestyle' },
  { name: 'GraduationCap', label: 'Educação & Cursos', icon: GraduationCap, categoryGroup: 'general' },
  { name: 'BookOpen', label: 'Livros & Estudos', icon: BookOpen, categoryGroup: 'general' },
  { name: 'Tv', label: 'Streaming / TV', icon: Tv, categoryGroup: 'general' },
  { name: 'Gamepad2', label: 'Jogos / Games', icon: Gamepad2, categoryGroup: 'general' },
  { name: 'Music', label: 'Música / Shows', icon: Music, categoryGroup: 'general' },
  { name: 'Film', label: 'Cinema / Cultura', icon: Film, categoryGroup: 'general' },
  { name: 'Smartphone', label: 'Telefonia / Celular', icon: Smartphone, categoryGroup: 'general' },
  { name: 'Scissors', label: 'Cuidados Pessoais', icon: Scissors, categoryGroup: 'lifestyle' },
  { name: 'Baby', label: 'Filhos / Bebês', icon: Baby, categoryGroup: 'general' },
  { name: 'PawPrint', label: 'Pets / Animais', icon: PawPrint, categoryGroup: 'general' },
  { name: 'Sparkles', label: 'Beleza & Estética', icon: Sparkles, categoryGroup: 'lifestyle' },
  { name: 'PlusCircle', label: 'Outras Entradas', icon: PlusCircle, categoryGroup: 'work_finance' },
  { name: 'CircleEllipsis', label: 'Outros Gastos', icon: CircleEllipsis, categoryGroup: 'general' },
  { name: 'Tag', label: 'Geral', icon: Tag, categoryGroup: 'general' },
];

export const CATEGORY_COLORS = [
  { hex: '#10b981', label: 'Esmeralda' },
  { hex: '#06b6d4', label: 'Ciano' },
  { hex: '#3b82f6', label: 'Azul' },
  { hex: '#6366f1', label: 'Índigo' },
  { hex: '#8b5cf6', label: 'Roxo' },
  { hex: '#d946ef', label: 'Fúcsia' },
  { hex: '#ec4899', label: 'Rosa' },
  { hex: '#ef4444', label: 'Vermelho' },
  { hex: '#f97316', label: 'Laranja' },
  { hex: '#f59e0b', label: 'Âmbar' },
  { hex: '#84cc16', label: 'Lima' },
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#0284c7', label: 'Azul Celeste' },
  { hex: '#7c3aed', label: 'Violeta' },
  { hex: '#64748b', label: 'Ardósia' },
  { hex: '#94a3b8', label: 'Cinza Neutro' },
];

const ICON_MAP = new Map<string, LucideIcon>(
  CATEGORY_ICONS.map(item => [item.name, item.icon])
);

interface CategoryIconProps {
  name?: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name,
  className = 'w-4 h-4',
}) => {
  const IconComponent = (name ? ICON_MAP.get(name) : undefined) || Tag;
  return <IconComponent className={className} />;
};
