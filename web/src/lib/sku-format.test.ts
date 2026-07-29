import { describe, it, expect } from 'vitest'
import { validarFormatoSku, type EmpresaConfigSku } from './sku'

function makeConfig(overrides: Partial<EmpresaConfigSku> = {}): EmpresaConfigSku {
  return {
    id: 'cfg-1',
    empresa_id: 'emp-1',
    autogenerar_activo: true,
    plantilla: 'categoria_secuencial',
    usa_categoria: true,
    modo_contador: 'por_categoria',
    longitud_secuencial: 3,
    prefijo_manual: null,
    umbral_similitud: 0.3,
    creado_en: '2026-01-01',
    ...overrides,
  }
}

describe('validarFormatoSku', () => {
  it('retorna null si el SKU está vacío', () => {
    expect(validarFormatoSku('', null)).toBeNull()
    expect(validarFormatoSku('  ', null)).toBeNull()
  })

  it('retorna null si no hay config', () => {
    expect(validarFormatoSku('FER-001', null)).toBeNull()
  })

  describe('plantilla: categoria_secuencial', () => {
    const config = makeConfig({ plantilla: 'categoria_secuencial', longitud_secuencial: 3 })

    it('acepta SKU válido con categoría', () => {
      expect(validarFormatoSku('FER-001', config, 'FER')).toBeNull()
      expect(validarFormatoSku('HOG-042', config, 'HOG')).toBeNull()
    })

    it('acepta SKU válido sin categoría (usa placeholder)', () => {
      expect(validarFormatoSku('ABC-001', config)).toBeNull()
    })

    it('rechaza SKU sin guión', () => {
      expect(validarFormatoSku('FER001', config)).toContain('Formato esperado')
    })

    it('rechaza SKU con pocos dígitos', () => {
      expect(validarFormatoSku('FER-01', config)).toContain('Formato esperado')
    })

    it('rechaza SKU con muchos dígitos', () => {
      expect(validarFormatoSku('FER-0001', config)).toContain('Formato esperado')
    })

    it('rechaza SKU con minúsculas en categoría (se normaliza)', () => {
      // La validación compara en uppercase, así que 'fer-001' debería pasar
      expect(validarFormatoSku('fer-001', config)).toBeNull()
    })
  })

  describe('plantilla: solo_secuencial', () => {
    const config = makeConfig({ plantilla: 'solo_secuencial', longitud_secuencial: 5 })

    it('acepta SKU válido solo numérico', () => {
      expect(validarFormatoSku('00001', config)).toBeNull()
      expect(validarFormatoSku('00123', config)).toBeNull()
    })

    it('rechaza SKU con letras', () => {
      expect(validarFormatoSku('ABC01', config)).toContain('Formato esperado')
    })

    it('rechaza SKU con guión', () => {
      expect(validarFormatoSku('001-01', config)).toContain('Formato esperado')
    })

    it('rechaza SKU con pocos dígitos', () => {
      expect(validarFormatoSku('01', config)).toContain('Formato esperado')
    })
  })

  describe('plantilla: prefijo_fijo_secuencial', () => {
    const config = makeConfig({
      plantilla: 'prefijo_fijo_secuencial',
      prefijo_manual: 'FER',
      longitud_secuencial: 4,
    })

    it('acepta SKU válido con prefijo', () => {
      expect(validarFormatoSku('FER-0001', config)).toBeNull()
    })

    it('acepta prefijo en minúsculas (se normaliza)', () => {
      expect(validarFormatoSku('fer-0001', config)).toBeNull()
    })

    it('rechaza SKU sin guión', () => {
      expect(validarFormatoSku('FER0001', config)).toContain('Formato esperado')
    })

    it('rechaza SKU con dígitos de más', () => {
      expect(validarFormatoSku('FER-00001', config)).toContain('Formato esperado')
    })
  })

  describe('longitud variable', () => {
    it('longitud_secuencial=2 acepta 2 dígitos', () => {
      const config = makeConfig({ plantilla: 'solo_secuencial', longitud_secuencial: 2 })
      expect(validarFormatoSku('01', config)).toBeNull()
      expect(validarFormatoSku('99', config)).toBeNull()
    })

    it('longitud_secuencial=2 rechaza 3 dígitos', () => {
      const config = makeConfig({ plantilla: 'solo_secuencial', longitud_secuencial: 2 })
      expect(validarFormatoSku('001', config)).toContain('Formato esperado')
    })

    it('longitud_secuencial=6 acepta 6 dígitos', () => {
      const config = makeConfig({ plantilla: 'solo_secuencial', longitud_secuencial: 6 })
      expect(validarFormatoSku('000001', config)).toBeNull()
    })
  })
})
