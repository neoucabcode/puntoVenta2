# 02 — Login / Registro

Ambas páginas usan la misma estructura: formulario centrado con clase `.card`.

## Login (`/login`)

```
main.center                      ← contenedor centrado
└── form.card                    ← tarjeta del formulario
    ├── h1                       "PuntoVenta2"
    ├── input[placeholder="Email"]
    ├── input[type="password"]   placeholder="Contraseña"
    ├── .error                   mensaje de error (si hay)
    ├── button[type="submit"]    "Entrar"
    └── a[href="/registro"]      "Crear cuenta / empresa"
```

## Registro (`/registro`)

```
main.center                      ← contenedor centrado
└── form.card                    ← tarjeta del formulario
    ├── h1                       "Alta de ferretería"
    ├── input                    placeholder="Nombre de la ferretería"
    ├── input                    placeholder="Tu nombre"
    ├── input                    placeholder="Email admin"
    ├── input[type="password"]   placeholder="Contraseña"
    ├── .error                   mensaje de error (si hay)
    ├── .ok                      mensaje de éxito (si hay)
    ├── button[type="submit"]    "Crear"
    └── a[href="/login"]         "Ya tengo cuenta"
```

## Flujo registro

1. `registro(email, password, nombreAdmin)` → crea usuario en Supabase Auth
2. `crearEmpresaConAdmin(nombreEmpresa, userId, nombreAdmin)` → RPC atómico empresa+admin
3. Navigate a `/`
