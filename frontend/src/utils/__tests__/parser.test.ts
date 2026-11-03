import { describe, it, expect } from 'vitest';
import { parseQuickReminder } from '../parser';
import { getTodayKey } from '../dateUtils';

describe('parseQuickReminder', () => {
  it('extracts priority flag correctly', () => {
    const resHigh = parseQuickReminder('Hacer reporte !alta');
    expect(resHigh.priority).toBe('high');
    expect(resHigh.title).toBe('Hacer reporte');

    const resUrgente = parseQuickReminder('Revisar servidor !urgente');
    expect(resUrgente.priority).toBe('high');

    const resBaja = parseQuickReminder('Comprar lapiceros !baja');
    expect(resBaja.priority).toBe('low');
  });

  it('extracts category hashtags', () => {
    const res = parseQuickReminder('Enviar cotización #Trabajo !alta');
    expect(res.category).toBe('Trabajo');
    expect(res.priority).toBe('high');
    expect(res.title).toBe('Enviar cotización');
  });

  it('handles relative date keywords like mañana and hoy', () => {
    const resManana = parseQuickReminder('Llamar al médico mañana 10:00 #Salud');
    expect(resManana.date).toBe(getTodayKey(1));
    expect(resManana.time).toBe('10:00');
    expect(resManana.category).toBe('Salud');
    expect(resManana.title).toBe('Llamar al médico');

    const resHoy = parseQuickReminder('Reunión urgente hoy 14:30');
    expect(resHoy.date).toBe(getTodayKey(0));
    expect(resHoy.time).toBe('14:30');
    expect(resHoy.title).toBe('Reunión urgente');
  });

  it('handles 12-hour am/pm times', () => {
    const res = parseQuickReminder('Cita dental a las 4pm #Salud');
    expect(res.time).toBe('16:00');
    expect(res.category).toBe('Salud');
    expect(res.title).toBe('Cita dental');
  });
});
