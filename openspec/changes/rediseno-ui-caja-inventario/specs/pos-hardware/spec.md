# pos-hardware Specification

Integración de lector de código (SKU/QR) e impresora, con fallback manual. Slice 6.

## ADDED Requirements

#### Requirement: Lector de código (WebHID) con fallback

<!-- slice: 6 -->

El sistema DEBE soportar la captura de SKU/QR vía lector USB HID (WebHID) que precarga el código en
la caja; si WebHID no está disponible en el navegador, DEBE permitir el ingreso manual del código.

##### Scenario: Lectura por WebHID

- **Given** lector HID conectado y soporte WebHID
- **When** se escanea un SKU
- **Then** el sistema llena el campo de búsqueda/carrito con el código

##### Scenario: Fallback manual sin WebHID

- **Given** navegador sin WebHID
- **When** el usuario intenta escanear
- **Then** el sistema ofrece input manual y lo trata igual que un escaneo

#### Requirement: Impresión de comprobante

<!-- slice: 6 -->

El sistema DEBE imprimir comprobantes vía WebUSB cuando el dispositivo/impresora lo permita, y DEBE
tener fallback a la impresión del navegador (window.print / diálogo) cuando WebUSB no esté disponible.

##### Scenario: Impresión WebUSB

- **Given** impresora térmica WebUSB emparejada
- **When** el usuario imprime comprobante
- **Then** el sistema envía el ticket a la impresora térmica

##### Scenario: Fallback a print del navegador

- **Given** WebUSB no soportado
- **When** el usuario imprime
- **Then** el sistema abre el diálogo de impresión del navegador con el formato del comprobante
